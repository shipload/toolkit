import { Command } from "commander";
import pkg from "../package.json" with { type: "json" };
import * as addmodule from "./commands/action/addmodule";
import * as blend from "./commands/action/blend";
import * as cancel from "./commands/action/cancel";
import * as claimstarter from "./commands/action/claimstarter";
import * as craft from "./commands/action/craft";
import * as deploy from "./commands/action/deploy";
import * as foundcompany from "./commands/action/foundcompany";
import * as gather from "./commands/action/gather";
import * as grouptravel from "./commands/action/grouptravel";
import * as join from "./commands/action/join";
import * as recharge from "./commands/action/recharge";
import * as resolve from "./commands/action/resolve";
import * as rmmodule from "./commands/action/rmmodule";
import * as transfer from "./commands/action/transfer";
import * as travel from "./commands/action/travel";
import * as wait from "./commands/action/wait";
import * as warp from "./commands/action/warp";
import * as wrap from "./commands/action/wrap";
import * as init from "./commands/init";
import * as config from "./commands/query/config";
import * as entities from "./commands/query/entities";
import * as entity from "./commands/query/entity";
import * as epoch from "./commands/query/epoch";
import * as inventory from "./commands/query/inventory";
import * as items from "./commands/query/items";
import * as location from "./commands/query/location";
import * as modules from "./commands/query/modules";
import * as nearby from "./commands/query/nearby";
import * as nftinfo from "./commands/query/nftinfo";
import * as player from "./commands/query/player";
import * as recipe from "./commands/query/recipe";
import * as resources from "./commands/query/resources";
import * as status from "./commands/query/status";
import * as stratum from "./commands/query/stratum";
import * as tasks from "./commands/query/tasks";
import * as whoami from "./commands/query/whoami";
import * as tools from "./commands/tools";

const PACKAGE = {
	name: "shiploadcli",
	version: pkg.version,
	description: "Shipload game CLI — query state and submit actions",
};

export function build(): Command {
	const program = new Command();
	program.name(PACKAGE.name).version(PACKAGE.version).description(PACKAGE.description);

	program.addHelpText(
		"before",
		[
			"Shipload CLI — query state and submit actions.",
			"",
			'First time?  Run: shiploadcli foundcompany "<name>" && shiploadcli join && shiploadcli claimstarter',
			"",
			"Commands are grouped as: Query (read-only), Action (transacting), Tools (diagnostics).",
			"",
		].join("\n"),
	);

	init.register(program);
	whoami.register(program);
	status.register(program);
	epoch.register(program);
	player.register(program);
	entity.register(program);
	entities.register(program);
	location.register(program);
	nearby.register(program);
	items.register(program);
	recipe.register(program);
	config.register(program);
	resources.register(program);
	modules.register(program);
	nftinfo.register(program);
	stratum.register(program);
	inventory.register(program);
	tasks.register(program);

	foundcompany.register(program);
	join.register(program);
	claimstarter.register(program);
	travel.register(program);
	grouptravel.register(program);
	warp.register(program);
	gather.register(program);
	transfer.register(program);
	recharge.register(program);
	craft.register(program);
	blend.register(program);
	deploy.register(program);
	wrap.register(program);
	addmodule.register(program);
	rmmodule.register(program);
	resolve.register(program);
	cancel.register(program);
	wait.register(program);

	tools.register(program);

	return program;
}

export function run(argv: string[] = process.argv): void {
	const program = build();
	program.parse(argv);
	if (argv.slice(2).length === 0) {
		program.outputHelp();
	}
}
