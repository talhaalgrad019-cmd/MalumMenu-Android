import { ObsidianLayout, add, CENTER } from "frida-java-menu";

import { I18n } from "../../i18n/I18n";
import { State } from "../../data/State";
import { UnityUtils } from "../../utils/UnityUtils";
import { ModuleManager } from "../../core/ModuleManager";
import { PlayerModule } from "../../modules/Player";
import { HostModule } from "../../modules/Host";

export class RolesTab {
    static draw(layout: ObsidianLayout) {
        const roles = layout.textView(I18n.t("menu.tabs.roles"));
        roles.gravity = CENTER;
        add(roles);

        add(
            layout.button(
                I18n.t("menu.functions.complete_my_tasks"),
                UnityUtils.run(() => ModuleManager.get(PlayerModule)?.completeMyTasks())
            )
        );

        const cooldowns = layout.textView("<b>——— Cooldowns ———</b>");
        cooldowns.gravity = CENTER;
        add(cooldowns);

        add(
            layout.toggle("Remove All Cooldowns", (state: boolean) => {
                State.noCooldowns = state;
            })
        );

        const host = layout.textView("<b>——— Host Only ———</b>");
        host.gravity = CENTER;
        add(host);

        add(
            layout.button(
                "Make Me Impostor",
                UnityUtils.run(() => ModuleManager.get(HostModule)?.makeMeImpostor())
            )
        );

        add(
            layout.button(
                "Next Player (select)",
                UnityUtils.run(() => ModuleManager.get(HostModule)?.nextPlayer())
            )
        );

        add(
            layout.button(
                "Make Selected Impostor",
                UnityUtils.run(() => ModuleManager.get(HostModule)?.makeSelectedImpostor())
            )
        );

        add(
            layout.button(
                "Make Selected Crewmate",
                UnityUtils.run(() => ModuleManager.get(HostModule)?.makeSelectedCrewmate())
            )
        );
    }
}
