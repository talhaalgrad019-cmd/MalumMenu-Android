import { AssemblyHelper } from "../core/AssemblyHelper";
import { BaseModule } from "../core/BaseModule";
import { State } from "../data/State";
import { Logger } from "../logger/Logger";

export class ESPModule extends BaseModule {
    public readonly name = "ESP";

    // Classes
    private Camera!: Il2Cpp.Class;
    private Color!: Il2Cpp.Class;
    private HudManager!: Il2Cpp.Class;
    private PlayerControl!: Il2Cpp.Class;

    // Methods
    private PlayerControl_FixedUpdate!: Il2Cpp.Method;
    private HudManager_get_Instance!: Il2Cpp.Method;
    private Camera_get_main!: Il2Cpp.Method;

    private zoomWasOn = false;
    private lastSlowTick = 0;
    private loggedCooldowns = new Set<string>();

    // Colors (UnityEngine.Color structs)
    private impostorColor!: Il2Cpp.ValueType;
    private crewColor!: Il2Cpp.ValueType;
    private whiteColor!: Il2Cpp.ValueType;

    public init(): void {
        this.Camera = AssemblyHelper.CoreModule.class("UnityEngine.Camera");
        this.Color = AssemblyHelper.CoreModule.class("UnityEngine.Color");
        this.HudManager = AssemblyHelper.AssemblyCSharp.class("HudManager");
        this.PlayerControl = AssemblyHelper.AssemblyCSharp.class("PlayerControl");

        this.PlayerControl_FixedUpdate = this.PlayerControl.method<void>("FixedUpdate");
        this.HudManager_get_Instance = this.HudManager.method<Il2Cpp.Object>("get_Instance");
        this.Camera_get_main = this.Camera.method<Il2Cpp.Object>("get_main");

        this.impostorColor = this.createColor(1, 0.1, 0.1, 1); // red
        this.crewColor = this.createColor(0.2, 0.9, 1, 1); // cyan
        this.whiteColor = this.createColor(1, 1, 1, 1);
    }

    public override initHooks(): void {
        const module = this;

        this.PlayerControl_FixedUpdate.implementation = function (): void {
            // Let the game do its thing first, then paint over the name color
            this.method<void>("FixedUpdate").invoke();

            // Zoom and cooldowns run at most ~7 times a second (not every tick for every player)
            const now = Date.now();
            if (now - module.lastSlowTick >= 150) {
                module.lastSlowTick = now;
                module.applyZoom();
                module.removeCooldowns();
            }

            if (!State.roleEsp) return;

            try {
                module.colorPlayer(this as Il2Cpp.Object);
            } catch (e) {
                Logger.debug(`[${module.name}::FixedUpdate] ${e} (expected while the player is still loading)`);
            }
        };
    }

    /** Zoom out by raising the camera's orthographic size (vanilla is 3) */
    private applyZoom(): void {
        try {
            if (!State.zoom) {
                if (this.zoomWasOn) {
                    this.setCameraSize(3);
                    this.zoomWasOn = false;
                }
                return;
            }

            this.setCameraSize(Math.max(3, State.zoomValue));
            this.zoomWasOn = true;
        } catch (e) {
            Logger.debug(`[${this.name}::applyZoom] ${e}`);
        }
    }

    /** Remove All Cooldowns: kill timer plus every role/ability/sabotage button (local player only) */
    private removeCooldowns(): void {
        if (!State.noCooldowns) return;

        try {
            const local = this.PlayerControl.field<Il2Cpp.Object>("LocalPlayer").value;
            if (local.isNull()) return;

            // Impostor kill cooldown
            try {
                local.field<number>("killTimer").value = 0;
                this.logOnce("killTimer");
            } catch (e) {
                this.logOnce("killTimer failed: " + e);
            }

            // Every role button (kill, ability, sabotage, vent)
            const hud = this.HudManager_get_Instance.invoke();
            if (hud.isNull()) return;

            const buttons = ["KillButton", "AbilityButton", "SabotageButton", "ImpostorVentButton"];
            for (const name of buttons) {
                try {
                    const button = hud.field<Il2Cpp.Object>(name).value;
                    if (button.isNull()) continue;

                    const setCoolDown = button.tryMethod("SetCoolDown");
                    if (!setCoolDown) continue;

                    setCoolDown.invoke(0, 1);
                    this.logOnce(name);
                } catch (e) {
                    this.logOnce(name + " failed: " + e);
                }
            }
        } catch (e) {
            Logger.debug(`[${this.name}::removeCooldowns] ${e}`);
        }
    }

    private logOnce(key: string): void {
        if (this.loggedCooldowns.has(key)) return;
        this.loggedCooldowns.add(key);
        Logger.info(`[${this.name}] No cooldown: ${key}`);
    }

    private setCameraSize(size: number): void {
        const camera = this.Camera_get_main.invoke();
        if (camera.isNull()) return;

        camera.method("set_orthographicSize").invoke(size);
    }

    /** Colors one player's name based on their role: red = impostor, cyan = crew */
    private colorPlayer(player: Il2Cpp.Object): void {
        // NetworkedPlayerInfo
        const data = player.method<Il2Cpp.Object>("get_Data").invoke();
        if (data.isNull()) return;

        // RoleBehaviour
        const role = data.field<Il2Cpp.Object>("Role").value;
        if (role.isNull()) return;

        const color = this.isImpostor(role) ? this.impostorColor : this.crewColor;
        this.setNameColor(player, color);
    }

    private isImpostor(role: Il2Cpp.Object): boolean {
        const getter = role.tryMethod<boolean>("get_IsImpostor");
        if (getter) return getter.invoke();

        // Fallback: RoleTeamTypes.Crewmate = 0, RoleTeamTypes.Impostor = 1
        return role.field<number>("TeamType").value === 1;
    }

    private setNameColor(player: Il2Cpp.Object, color: Il2Cpp.ValueType): void {
        const cosmetics = player.field<Il2Cpp.Object>("cosmetics").value;
        if (cosmetics.isNull()) return;

        const nameText = cosmetics.field<Il2Cpp.Object>("nameText").value;
        if (nameText.isNull()) return;

        nameText.method("set_color").invoke(color);
    }

    /** Called when the toggle is switched. Turning it off puts every name back to white */
    public toggleRoleEsp(state: boolean): void {
        State.roleEsp = state;
        if (state) return;

        const players = this.PlayerControl.field<Il2Cpp.Object>("AllPlayerControls").value;
        if (players.isNull()) return;

        const count = players.method<number>("get_Count").invoke();
        for (let i = 0; i < count; i++) {
            try {
                const player = players.method<Il2Cpp.Object>("get_Item").invoke(i);
                if (player.isNull()) continue;
                this.setNameColor(player, this.whiteColor);
            } catch (e) {
                Logger.debug(`[${this.name}::toggleRoleEsp] ${e}`);
            }
        }
    }

    /** Wrapper over UnityEngine::Color::.ctor(r, g, b, a) */
    private createColor(r: number, g: number, b: number, a: number): Il2Cpp.ValueType {
        const instance = this.Color.alloc();
        instance.method(".ctor", 4).invoke(r, g, b, a);
        return instance.unbox();
    }
        }
