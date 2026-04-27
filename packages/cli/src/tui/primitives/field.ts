export interface FieldSpec {
	icon: string;
	value: string;
	trailing?: string;
}

export function renderField(spec: FieldSpec): string {
	const base = `${spec.icon} ${spec.value}`;
	return spec.trailing ? `${base}  ${spec.trailing}` : base;
}
