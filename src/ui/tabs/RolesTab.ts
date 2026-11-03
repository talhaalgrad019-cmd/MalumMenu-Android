import { ObsidianLayout, add, CENTER } from "frida-java-menu";

import { I18n } from "../../i18n/I18n";
import { State } from "../../data/State";
import { UnityUtils } from "../../utils/UnityUtils";
import { ModuleManager } from "../../core/ModuleManager";
import { PlayerModule } from "../../modules/Player";

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
    }
}
