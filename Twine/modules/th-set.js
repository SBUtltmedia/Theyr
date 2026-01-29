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

            const isException = window.exceptions && window.exceptions.some(ex =>
                varPath === ex || varPath.startsWith(ex.replace('$', '') + '.')
            );

            if (operator === '=') {
                State.setVar(varPath, rightValue);
                if (!isException && window.socket && window.socket.connected) {
                    window.sendStateUpdate(varPath, rightValue);
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
                    State.setVar(varPath, optimisticValue);
                } catch (err) {
                    console.warn("[th-set] Optimistic update failed", err);
                }

                if (!isException && window.socket && window.socket.connected) {
                    let operationName = 'add';
                    if (operator === '-=') operationName = 'subtract';
                    if (operator === '*=') operationName = 'multiply';
                    if (operator === '/=') operationName = 'divide';
                    if (operator === '%=') operationName = 'modulus';

                    window.sendAtomicUpdate(varPath, operationName, rightValue);
                }
            }
            $(document).trigger(':liveupdateinternal');
        }
    });
})();
