(function() {
    "use strict";

    Macro.add('th-set', {
        skipArgs: true,
        handler: function() {
            if (this.args.raw.length === 0) {
                return this.error('th-set macro requires arguments');
            }

            let fullExpression = this.args.raw.trim();
            const assignMatch = fullExpression.match(/^(['"]?)(\$[a-zA-Z_][\w.\[\]"'$]*)(\1)(\s*)(=|\+=|-=|\*=|\/=|%=|\bto\b)(\s*)(.+)$/i);

            if (!assignMatch) {
                return this.error(`Invalid th-set syntax: ${fullExpression}`);
            }

            const varPath = assignMatch[2];
            let operator = assignMatch[5].trim().toLowerCase();
            if (operator === 'to') operator = '=';
            const rightExpr = assignMatch[7];

            let rightValue;
            try {
                rightValue = Scripting.evalTwineScript(rightExpr);
            } catch (e) {
                return this.error(`bad evaluation: ${typeof e === 'object' ? e.message : e}`);
            }

            // Resolve bracketed variables in the path (e.g., $users[$userId] -> $users["TestPlayer"])
            // This ensures the server (which doesn't know SugarCube variables) gets a clean path.
            let resolvedVarPath = varPath.replace(/\[\s*(\$[a-zA-Z_]\w*)\s*\]/g, (match, v) => {
                try {
                    const val = State.getVar(v);
                    return "[" + JSON.stringify(val) + "]";
                } catch (e) {
                    return match;
                }
            });

            const isException = window.exceptions && window.exceptions.some(ex =>
                varPath === ex || varPath.startsWith(ex.replace('$', '') + '.')
            );

            if (operator === '=') {
                // Optimistic local update
                try {
                    State.temporary._th_temp_val = rightValue;
                    
                    // Robust assignment: Ensure parent objects exist (e.g., $users["ID"])
                    // This prevents "Cannot set properties of undefined" errors.
                    const parts = resolvedVarPath.split('.');
                    if (parts.length > 1) {
                        const parentPath = parts.slice(0, -1).join('.');
                        if (!State.getVar(parentPath)) {
                            // If parent doesn't exist, try to initialize it as an object
                            State.setVar(parentPath, {});
                        }
                    }

                    Scripting.evalTwineScript(`${resolvedVarPath} = _th_temp_val`);
                } catch (err) {
                    // Fallback to simpler method
                    State.setVar(varPath, rightValue);
                }

                if (!isException && window.socket && window.socket.connected) {
                    window.sendStateUpdate(resolvedVarPath, rightValue);
                }
            } 
            else {
                try {
                    const currentValue = State.getVar(varPath) || 0;
                    let optimisticValue = currentValue;
                    
                    switch(operator) {
                        case '+=': optimisticValue += rightValue; break;
                        case '-=': optimisticValue -= rightValue; break;
                        case '*=': optimisticValue *= rightValue; break;
                        case '/=': optimisticValue /= rightValue; break;
                        case '%=': optimisticValue %= rightValue; break;
                    }

                    // Optimistic local update
                    State.temporary._th_temp_val = optimisticValue;
                    Scripting.evalTwineScript(`${resolvedVarPath} = _th_temp_val`);
                } catch (err) {
                    console.warn("[th-set] Optimistic update failed", err);
                }

                if (!isException && window.socket && window.socket.connected) {
                    let operationName = 'add';
                    if (operator === '-=') operationName = 'subtract';
                    if (operator === '*=') operationName = 'multiply';
                    if (operator === '/=') operationName = 'divide';
                    if (operator === '%=') operationName = 'modulus';

                    window.sendAtomicUpdate(resolvedVarPath, operationName, rightValue);
                }
            }
            $(document).trigger(':liveupdateinternal');
        }
    });
})();
