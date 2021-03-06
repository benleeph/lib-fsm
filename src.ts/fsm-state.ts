import { FsmEvent } from './fsm-event';

export type MooreFunction = (currentState: FsmState) => void;
export type MealyFunction = (currentState: FsmState, input: FsmEvent) => void;
export type GeneralFunction = () => void;
export type OutputFunction = GeneralFunction | MooreFunction | MealyFunction;

export class FsmState {

    private _initialStateRegionName: string | null = null;
    private _transitionTable: Map<FsmEvent, FsmState> | null = null;
    private _outputTable: Map<FsmEvent, OutputFunction | null> | null = null;

    constructor(private readonly _fsmName: string,
        private readonly _stateId: number,
        private readonly _stateName: string,
        private readonly _isFinalState: boolean = false,
        private _isDeterministic: boolean = true) {
        this._transitionTable = this._isFinalState ? null : new Map<FsmEvent, FsmState>();
        this._outputTable = this._isFinalState ? null : new Map<FsmEvent, OutputFunction>();
    }

    get fsmName() {
        return this._fsmName;
    }

    get stateId() {
        return this._stateId;
    }

    get stateName() {
        return this._stateName;
    }

    equals(otherState?: FsmState | number | string) {
        if (otherState instanceof FsmState) {
            return this._stateId === otherState.stateId && this._stateName === otherState.stateName;
        } else if (typeof otherState === "number") {
            return this._stateId === otherState;
        } else if (typeof otherState === "string") {
            return this._stateName === otherState;
        } else {
            return false;
        }
    }

    markInitial(fsmRegionName: string) {
        this._initialStateRegionName = fsmRegionName;
        return this;
    }

    unmarkInitial() {
        this._initialStateRegionName = null;
        return this;
    }

    markDeterministic() {
        this._isDeterministic = true;
        return this;
    }

    markNonDeterministic() {
        this._isDeterministic = false;
        return this;
    }

    isInitialState() {
        return (this._initialStateRegionName && this._initialStateRegionName.length > 0);
    }

    isDeterministic() {
        return this._isDeterministic;
    }

    get initialStateRegionName() {
        return this._initialStateRegionName;
    }

    isFinalState() {
        return (this._isFinalState || !this._transitionTable || this._transitionTable.size === 0);
    }

    executeOutput(input: FsmEvent): void {
        const nextOutput = this.nextOutput(input);
        if (typeof nextOutput === "undefined" || nextOutput == null) {
            return;
        }
        if (nextOutput.length === 0) {
            (nextOutput as GeneralFunction)();
        } else if (nextOutput.length === 1) {
            (nextOutput as MooreFunction)(this);
        } else if (nextOutput.length === 2 && input != null) {
            (nextOutput as MealyFunction)(this, input);
        }
        return;
    }

    addTransition(onEvent: FsmEvent | null, nextState: FsmState | null, output?: OutputFunction) {
        if (this._isFinalState || !this._transitionTable) {
            throw new Error(`Invalid action: cannot add transition to final state: ${this.toString()}`);
        }

        if (!onEvent) {
            throw new Error('Invalid action: cannot add transition for an invalid event');
        }

        if (!nextState) {
            throw new Error('Invalid action: cannot add transition for an invalid nextState');
        }

        const currentEventTransition = this._transitionTable.get(onEvent);
        if (currentEventTransition) {
            if (currentEventTransition.equals(nextState)) {
                return this;
            }
            throw new Error(`Invalid action: cannot add multiple transition for an event: ${onEvent} --. ${nextState}`);
        }

        this._transitionTable.set(onEvent, nextState);
        this._outputTable?.set(onEvent, output || null);
        return this;
    }

    removeTransition(onEvent: FsmEvent | null) {
        if (this._isFinalState || !this._transitionTable) {
            throw new Error(`Invalid action: cannot remove transition for final state: ${this.toString()}`);
        }

        if (!onEvent) {
            throw new Error('Invalid action: cannot remove transition for an invalid event');
        }

        if (!this._transitionTable.has(onEvent)) {
            throw new Error(`Invalid action: cannot remove non-existent transition for event: ${onEvent}`);
        }

        this._transitionTable.delete(onEvent);
        return this;
    }

    isTransitionValid(onEvent: FsmEvent) {
        return this.nextState(onEvent) !== null;
    }

    nextState(onEvent: FsmEvent): FsmState | null {
        if (this._isFinalState || !this._transitionTable || !onEvent) { return null; }
        return this._transitionTable.get(onEvent) || null;
    }

    nextOutput(onEvent: FsmEvent): OutputFunction | null {
        if (this._isFinalState || !this._outputTable || !onEvent) { return null; }
        return this._outputTable.get(onEvent) || null;
    }

    hasNextStateOnEvent(onEvent: FsmEvent, nextState: FsmState) {
        if (!this._transitionTable || !onEvent || !nextState) { return false; }
        return nextState.equals(this._transitionTable.get(onEvent));
    }

    hasNextTransition(nextState: FsmState) {
        if (!this._transitionTable || !nextState) { return false; }

        for (const state of this._transitionTable.values()) {
            if (state.equals(nextState)) { return true; }
        }
        return false;
    }

    get transitionTableSize() {
        return (this._transitionTable ? this._transitionTable.size : 0);
    }

    getStateTableString(separator?: string) {
        if (!separator) {
            separator = '';
        }
        if (!this._transitionTable || this.isFinalState()) {
            return `${this.toString()} ---[X]\n`;
        }

        let stateTable = '';
        this._transitionTable.forEach((nextState, event) => {
            if (stateTable) {
                stateTable += '\t';
            }
            stateTable += `${this.toString()} ---[ ${event} ]--> ${nextState}\n`;
        });
        return stateTable;
    }

    toString() {
        const initialStateInfo = this.isInitialState() ? `:IS@${this.initialStateRegionName}` : '';
        const finalStateInfo = this.isFinalState() ? ':FS' : '';
        return `${this.stateName}(${this.stateId}${initialStateInfo}${finalStateInfo})`;
    }

}