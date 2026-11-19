// Makifind host script. Plain-string results: "ok:..." / "err:<code>".

// One effect per line: displayName \t matchName \t category.
function fxList() {
    var out = [];
    for (var i = 0; i < app.effects.length; i++) {
        var e = app.effects[i];
        if (!e.displayName || !e.matchName) continue;
        out.push(e.displayName + "\t" + e.matchName + "\t" + (e.category || ""));
    }
    return "ok:" + out.join("\n");
}

// Adds the effect to every selected layer, or to a new adjustment layer on top.
function fxApply(matchName, displayName, asAdjustment) {
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) return "err:nocomp";

    var targets = [];
    if (!asAdjustment) {
        targets = comp.selectedLayers;
        if (!targets.length) return "err:nolayers";
    }

    var added = 0;
    app.beginUndoGroup("Makifind: " + displayName);
    try {
        if (asAdjustment) {
            var adj = comp.layers.addSolid([1, 1, 1], displayName, comp.width, comp.height, comp.pixelAspect, comp.duration);
            adj.adjustmentLayer = true;
            targets = [adj];
        }
        for (var i = 0; i < targets.length; i++) {
            var fx = targets[i].property("ADBE Effect Parade");
            if (fx && fx.canAddProperty(matchName)) {
                fx.addProperty(matchName);
                added++;
            }
        }
    } catch (e) {
        app.endUndoGroup();
        return "err:" + e.toString();
    }
    app.endUndoGroup();
    return added ? "ok:" + added : "err:cantadd";
}
