import { toast } from "frida-java-menu";

import { AssemblyHelper } from "../core/AssemblyHelper";
import { BaseModule } from "../core/BaseModule";
import { Logger } from "../logger/Logger";

export class HostModule extends BaseModule {
    public readonly name = "Host";

    // RoleTypes enum values
    private static readonly CREWMATE = 0;
    private static readonly IMPOSTOR = 1;

    private AmongUsClient!: Il2Cpp.Class;
    private PlayerControl!: Il2Cpp.Class;

    private selected = 0;

    public init(): void {
        this.AmongUsClient = AssemblyHelper.AssemblyCSharp.class("AmongUsClient");
        this.PlayerControl = AssemblyHelper.AssemblyCSharp.class("PlayerControl");
    }

    /** Moves the selection to the next player and shows their name */
    public nextPlayer(): void {
        const players = this.getPlayers();
        if (players.length === 0) {
            toast("No players found", 0);
            return;
        }

        this.selected = (this.selected + 1) % players.length;
        toast(`Selected: ${this.getName(players[this.selected], this.selected)}`, 0);
    }

    public makeSelectedImpostor(): void {
        this.setRole(this.getSelected(), HostModule.IMPOSTOR);
    }

    public makeSelectedCrewmate(): void {
        this.setRole(this.getSelected(), HostModule.CREWMATE);
    }

    public makeMeImpostor(): void {
        const local = this.PlayerControl.field<Il2Cpp.Object>("LocalPlayer").value;
        this.setRole(local, HostModule.IMPOSTOR);
    }

    private setRole(player: Il2Cpp.Object | null, role: number): void {
        try {
            if (!player || player.isNull()) {
                toast("No player selected", 0);
                return;
            }

            if (!this.isHost()) {
                toast("You must be the host", 0);
                return;
            }

            // PlayerControl::RpcSetRole(RoleTypes roleType, bool canOverride)
            player.method("RpcSetRole", 2).invoke(role, true);
            toast(`Role set for ${this.getName(player, this.selected)}`, 0);
        } catch (e) {
            Logger.errorToast(e, `[${this.name}::setRole]`);
        }
    }

    private isHost(): boolean {
        const client = this.AmongUsClient.field<Il2Cpp.Object>("Instance").value;
        if (client.isNull()) return false;
        return client.method<boolean>("get_AmHost").invoke();
    }

    private getSelected(): Il2Cpp.Object | null {
        const players = this.getPlayers();
        if (players.length === 0) return null;
        if (this.selected >= players.length) this.selected = 0;
        return players[this.selected];
    }

    private getPlayers(): Il2Cpp.Object[] {
        const result: Il2Cpp.Object[] = [];

        const list = this.PlayerControl.field<Il2Cpp.Object>("AllPlayerControls").value;
        if (list.isNull()) return result;

        const count = list.method<number>("get_Count").invoke();
        for (let i = 0; i < count; i++) {
            const player = list.method<Il2Cpp.Object>("get_Item").invoke(i);
            if (!player.isNull()) result.push(player);
        }

        return result;
    }

    private getName(player: Il2Cpp.Object, index: number): string {
        try {
            const data = player.method<Il2Cpp.Object>("get_Data").invoke();
            const name = data.field<Il2Cpp.String>("PlayerName").value;
            return name.content ?? `Player ${index + 1}`;
        } catch {
            return `Player ${index + 1}`;
        }
    }
}
