import React, { useState } from "react"

import {
    SidebarFooter,
    SidebarGroup,
    SidebarMenu,
    SidebarMenuItem
} from "@tryghost/shade"
import WhatsNewDialog from "@/whats-new/components/whats-new-dialog";
import { UserMenu } from "./user-menu";
import { useSidebarBannerState } from "./hooks/use-sidebar-banner-state";
import { useFramework } from "@tryghost/admin-x-framework";

function AppSidebarFooter({ ...props }: React.ComponentProps<typeof SidebarFooter>) {
    const [isWhatsNewDialogOpen, setIsWhatsNewDialogOpen] = useState(false);
    const {hasBanner} = useSidebarBannerState();
    const {isEmbedded} = useFramework();

    if (isEmbedded) {
        return null;
    }

    return (
        <>
            <SidebarFooter {...props}>
                <SidebarGroup className={hasBanner ? 'pt-3' : ''}>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <UserMenu onOpenWhatsNew={() => setIsWhatsNewDialogOpen(true)} />
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarFooter>
            <WhatsNewDialog
                open={isWhatsNewDialogOpen}
                onOpenChange={setIsWhatsNewDialogOpen}
            />
        </>
    );
}

export default AppSidebarFooter;
