export interface TaskTimingContext {
	now: Date;
	activeIndex: number | null;
	remainingS: number;
}

type ScheduleStarted = { toMilliseconds(): number } | string | Date | undefined;

export interface ScheduleLike {
	started?: ScheduleStarted;
	tasks?: ReadonlyArray<unknown>;
}

function startedToMs(started: ScheduleStarted): number | null {
	if (started == null) return null;
	if (started instanceof Date) return started.getTime();
	if (typeof started === "string") {
		const parsed = Date.parse(started);
		return Number.isNaN(parsed) ? null : parsed;
	}
	if (typeof started === "object" && typeof started.toMilliseconds === "function") {
		return started.toMilliseconds();
	}
	return null;
}

export function computeTaskCompletionTimes(
	schedule: ScheduleLike,
	ctx: TaskTimingContext,
): Date[] {
	const tasks = schedule.tasks ?? [];
	if (tasks.length === 0) return [];

	const startedMs = startedToMs(schedule.started);
	if (startedMs == null) return [];

	const out: Date[] = new Array(tasks.length);

	const durationS = (i: number): number => {
		const raw = (tasks[i] as { duration?: bigint | number }).duration;
		return raw == null ? 0 : Number(raw);
	};

	if (ctx.activeIndex === null) {
		let cursorMs = startedMs;
		for (let i = 0; i < tasks.length; i++) {
			cursorMs += durationS(i) * 1000;
			out[i] = new Date(cursorMs);
		}
		return out;
	}

	let cursorMs = startedMs;
	for (let i = 0; i < ctx.activeIndex; i++) {
		cursorMs += durationS(i) * 1000;
		out[i] = new Date(cursorMs);
	}

	const activeEndsMs = ctx.now.getTime() + Math.max(0, ctx.remainingS) * 1000;
	out[ctx.activeIndex] = new Date(activeEndsMs);
	cursorMs = activeEndsMs;

	for (let i = ctx.activeIndex + 1; i < tasks.length; i++) {
		cursorMs += durationS(i) * 1000;
		out[i] = new Date(cursorMs);
	}
	return out;
}
