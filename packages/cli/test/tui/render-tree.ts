export function collectText(node: unknown): string[] {
    const out: string[] = []
    const visit = (n: unknown): void => {
        if (!n || typeof n !== 'object') return
        const obj = n as {props?: {content?: string}; children?: unknown[]}
        if (obj.props && typeof obj.props.content === 'string') out.push(obj.props.content)
        if (Array.isArray(obj.children)) obj.children.forEach(visit)
    }
    visit(node)
    return out
}
