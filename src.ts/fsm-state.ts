import { FsmEvent } from './fsm-event';

export class FsmState {

    private _initialStateRegionName: string | null = null;
    private _transitionTable: Map<FsmEvent, FsmState> | null = null;

    constructor(private readonly _fsmName: string, private readonly _stateId: number, private readonly _stateName: string, private _isFinalState: boolean = false) {
        this._transitionTable = this._isFinalState ? null : new Map<FsmEvent, FsmState>();
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

    equals(otherState?: FsmState) {
        if (otherState) {
            return (this._stateId === otherState.stateId && this._stateName === otherState.stateName);
        }
        return false;
    }

    markInitial(fsmRegionName: string) {
        this._initialStateRegionName = fsmRegionName;
        return this;
    }

    unmarkInitial() {
        this._initialStateRegionName = null;
        return this;
    }

    isInitialState() {
        return (this._initialStateRegionName && this._initialStateRegionName.length > 0);
    }

    get initialStateRegionName() {
        return this._initialStateRegionName;
    }

    isFinalState() {
        return (!this._transitionTable || this._transitionTable.size === 0);
    }

    addTransition(onEvent: FsmEvent, nextState: FsmState) {
        if (!this._transitionTable) {
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
        return this;
    }

    removeTransition(onEvent: FsmEvent) {
        if (!this._transitionTable) {
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

    nextState(onEvent: FsmEvent): FsmState | null {
        if (this._isFinalState || !this._transitionTable) { return null; }
        return this._transitionTable.get(onEvent) || null;
    }

    hasNextStateOnEvent(onEvent: FsmEvent, nextState: FsmState) {
        if (!this._transitionTable || !onEvent || !nextState) { return false; }
        return nextState.equals(this._transitionTable.get(onEvent));
    }

    isTransitionValid(onEvent: FsmEvent) {
        return this.nextState(onEvent) !== null;
    }

    hasNextTransition(nextState: FsmState) {
        if (!this._transitionTable || !nextState) { return false; }

        this._transitionTable.forEach((state) => {
            if (state.equals(nextState)) { return true; }
        });
        return false;
    }

    get transitionTableSize() {
        return (this._transitionTable ? this._transitionTable.size : 0);
    }

    get stateTableString() {
        if (!this._transitionTable || this.isFinalState()) {
            return `${this.toString()} ---[X]\n`;
        }

        let stateTable = '';
        this._transitionTable.forEach((nextState, event) => {
            stateTable += `${this.toString()} ---[ ${event} ]--> ${nextState}\n`;
        });
    }

    toString() {
        const initialStateInfo = this.isInitialState() ? `:IS@${this.initialStateRegionName}` : '';
        const finalStateInfo = this.isFinalState() ? ':FS' : '';
        return `${this.stateName}(${this.stateId}${initialStateInfo}${finalStateInfo})`;
    }

}