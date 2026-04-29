async function postJson<T>(url: string, body: unknown): Promise<T> {
	const res = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		throw new Error(
			`chain returned HTTP ${res.status}: ${await res.text()}`,
		);
	}
	return (await res.json()) as T;
}

export interface GetTableRowsOptions {
	chainUrl: string;
	code: string;
	scope: string;
	table: string;
	lower_bound?: number | string;
	upper_bound?: number | string;
	limit?: number;
	index_position?: number | string;
	key_type?: string;
	reverse?: boolean;
}

export interface GetTableRowsResponse {
	rows: unknown[];
	more: boolean;
	next_key?: string;
}

export async function getTableRows(
	opts: GetTableRowsOptions,
): Promise<GetTableRowsResponse> {
	const { chainUrl, ...rest } = opts;
	const base = chainUrl.replace(/\/+$/, "");
	return postJson<GetTableRowsResponse>(`${base}/v1/chain/get_table_rows`, {
		json: true,
		...rest,
	});
}

export interface GetRawCodeAndAbiOptions {
	chainUrl: string;
	account_name: string;
}

export interface GetRawCodeAndAbiResponse {
	account_name: string;
	wasm: string;
	abi: string;
}

export async function getRawCodeAndAbi(
	opts: GetRawCodeAndAbiOptions,
): Promise<GetRawCodeAndAbiResponse> {
	const base = opts.chainUrl.replace(/\/+$/, "");
	return postJson<GetRawCodeAndAbiResponse>(
		`${base}/v1/chain/get_raw_code_and_abi`,
		{
			account_name: opts.account_name,
		},
	);
}

export interface GetRawAbiOptions {
	chainUrl: string;
	account_name: string;
}

export interface GetRawAbiResponse {
	account_name: string;
	code_hash: string;
	abi_hash: string;
	abi: string;
}

export async function getRawAbi(
	opts: GetRawAbiOptions,
): Promise<GetRawAbiResponse> {
	const base = opts.chainUrl.replace(/\/+$/, "");
	return postJson<GetRawAbiResponse>(`${base}/v1/chain/get_raw_abi`, {
		account_name: opts.account_name,
	});
}
