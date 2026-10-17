import {ABI, Name, Serializer, Transaction} from '@wharfkit/antelope'
import type {NameType} from '@wharfkit/antelope'
import type {Contract} from '@wharfkit/contract'
import {computeLoaderPayload} from '../derivation/capabilities'

type ReadonlyData = Parameters<Contract['readonly']>[1]

function isLegacyLoader(obj: Record<string, unknown>): boolean {
    return (
        obj.payload === undefined &&
        obj.mass !== undefined &&
        obj.thrust !== undefined &&
        ('slot_index' in obj || 'quantity' in obj)
    )
}

export function payloadFromLegacyMass(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(payloadFromLegacyMass)
    if (!value || typeof value !== 'object') return value
    const out: Record<string, unknown> = {}
    for (const [key, field] of Object.entries(value)) out[key] = payloadFromLegacyMass(field)
    if (!isLegacyLoader(out)) return out
    const {mass, ...rest} = out
    return {...rest, payload: computeLoaderPayload(Math.max(0, (20 - Number(mass)) * 50))}
}

export function decodeLegacyLoaderReadonly(server: Contract): void {
    const original = server.readonly.bind(server)
    let chainAbi: Promise<ABI> | undefined

    function deployedAbi(): Promise<ABI> {
        chainAbi ??= server.client.v1.chain.get_abi(server.account).then((r) => {
            if (!r.abi) throw new Error(`No ABI deployed on ${server.account}`)
            return ABI.from(r.abi)
        })
        chainAbi.catch(() => (chainAbi = undefined))
        return chainAbi
    }

    server.readonly = async (name: NameType, data?: ReadonlyData) => {
        const action = server.action(name, data ?? {})
        action.authorization = []
        const transaction = Transaction.from({
            ref_block_num: 0,
            ref_block_prefix: 0,
            expiration: 0,
            actions: [action],
        })
        const response = await server.client.v1.chain.send_read_only_transaction(transaction)
        const result = server.abi.action_results.find((a) => Name.from(a.name).equals(name))
        if (response.processed.except || !result) return original(name, data)
        const hex = response.processed.action_traces[0].return_value_hex_data
        try {
            return Serializer.decode({data: hex, type: result.result_type, abi: server.abi})
        } catch {
            const legacy = Serializer.decode({
                data: hex,
                type: result.result_type,
                abi: await deployedAbi(),
            })
            return Serializer.decode({
                object: payloadFromLegacyMass(Serializer.objectify(legacy)),
                type: result.result_type,
                abi: server.abi,
            })
        }
    }
}
