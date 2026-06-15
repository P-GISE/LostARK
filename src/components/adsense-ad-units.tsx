"use client";

import { useEffect, useState } from "react";
import { contentShellClassName } from "@/components/ui";

const ADSENSE_CLIENT_ID = "ca-pub-5055865634735480";

type AdSenseRequest = Record<string, never>;

type AdSenseAdUnit = {
  readonly format: "auto" | "autorelaxed";
  readonly fullWidthResponsive: "true" | undefined;
  readonly slotId: string;
  readonly testId: string;
};

const ADSENSE_AD_UNITS = [
  {
    format: "auto",
    fullWidthResponsive: "true",
    slotId: "4012726766",
    testId: "adsense-display-ad",
  },
  {
    format: "autorelaxed",
    fullWidthResponsive: undefined,
    slotId: "6643298538",
    testId: "adsense-multiplex-ad",
  },
] as const satisfies readonly AdSenseAdUnit[];

declare global {
  interface Window {
    adsbygoogle?: AdSenseRequest[];
    __lostArkPartyAdSenseUnitsRequested?: boolean;
  }
}

export function GoogleAdSenseAdUnits() {
  const [hiddenSlotIds, setHiddenSlotIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  useEffect(() => {
    if (window.__lostArkPartyAdSenseUnitsRequested) {
      return;
    }

    window.__lostArkPartyAdSenseUnitsRequested = true;
    const adQueue = window.adsbygoogle ?? [];
    window.adsbygoogle = adQueue;

    for (let pushCount = 0; pushCount < ADSENSE_AD_UNITS.length; pushCount += 1) {
      adQueue.push({});
    }
  }, []);

  useEffect(() => {
    const hideSlot = (slotId: string) => {
      setHiddenSlotIds((currentHiddenSlotIds) => {
        if (currentHiddenSlotIds.has(slotId)) {
          return currentHiddenSlotIds;
        }

        const nextHiddenSlotIds = new Set(currentHiddenSlotIds);
        nextHiddenSlotIds.add(slotId);
        return nextHiddenSlotIds;
      });
    };

    const syncSlotVisibility = (slot: Element) => {
      const slotId = slot.getAttribute("data-ad-slot");
      if (slotId && slot.getAttribute("data-ad-status") === "unfilled") {
        hideSlot(slotId);
      }
    };

    const observer = new MutationObserver((mutationRecords) => {
      for (const mutationRecord of mutationRecords) {
        if (
          mutationRecord.attributeName === "data-ad-status" &&
          mutationRecord.target instanceof Element
        ) {
          syncSlotVisibility(mutationRecord.target);
        }
      }
    });

    const adSlots = document.querySelectorAll(".adsbygoogle[data-ad-slot]");
    for (const adSlot of adSlots) {
      observer.observe(adSlot, {
        attributeFilter: ["data-ad-status"],
        attributes: true,
      });
      syncSlotVisibility(adSlot);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const isAdRegionHidden = hiddenSlotIds.size >= ADSENSE_AD_UNITS.length;

  return (
    <aside
      aria-label="광고"
      className={`${contentShellClassName} pb-5 lg:pb-7`}
      hidden={isAdRegionHidden}
    >
      <div className="grid gap-4">
        {ADSENSE_AD_UNITS.map((adUnit) => (
          <div
            data-testid={`${adUnit.testId}-container`}
            hidden={hiddenSlotIds.has(adUnit.slotId)}
            key={adUnit.slotId}
          >
            <ins
              className="adsbygoogle"
              data-ad-client={ADSENSE_CLIENT_ID}
              data-ad-format={adUnit.format}
              data-ad-slot={adUnit.slotId}
              data-full-width-responsive={adUnit.fullWidthResponsive}
              data-testid={adUnit.testId}
              style={{ display: "block" }}
            />
          </div>
        ))}
      </div>
    </aside>
  );
}
