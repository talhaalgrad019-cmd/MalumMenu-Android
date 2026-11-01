import { ObsidianLayout, add, CENTER } from "frida-java-menu";

import { I18n } from "../../i18n/I18n";
import { State } from "../../data/State";
import { UnityUtils } from "../../utils/UnityUtils";
import { ModuleManager } from "../../core/ModuleManager";
import { ESPModule } from "../../modules/ESP";

export class ESPTab {
    static draw(layout: ObsidianLayout) {
        const esp = layout.textView(I18n.t("menu.tabs.esp"));
        esp.gravity = CENTER;
        add(esp);

        add(
            layout.toggle(I18n.t("menu.functions.no_shadows"), (state: boolean) => {
                State.noShadows = state;
            })
        );

        add(
            layout.toggle(
                I18n.t("menu.functions.role_esp"),
                UnityUtils.run((state: boolean) => {
                    ModuleManager.get(ESPModule)?.toggleRoleEsp(state);
                })
            )
        );

        add(
            layout.seekbar("Zoom: {0} / 20", 20, 0, (value: number) => {
                State.zoomValue = value;
            })
        );

        add(
            layout.toggle("Zoom Out", (state: boolean) => {
                State.zoom = state;
            })
        );
    }
}
