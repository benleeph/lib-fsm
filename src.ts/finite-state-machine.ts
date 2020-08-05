import { FsmState } from "./fsm-state";
import { FsmEvent } from "./fsm-event";

export interface FSMListener {
    onNewState(fsmName: string, initialState: FsmState): void;
    onStateTransition(fsmName: string, onEvent: FsmEvent, oldState: FsmState, newState: FsmState): void;
    onInvalidStateTransition(fsmName: string, onEvent: FsmEvent, currentState: FsmState): void;
    onEventAfterFinalState(fsmName: string, onEvent: FsmEvent, finalState: FsmState): void;
}

export class FiniteStateMachine {

    private readonly _states = new Map<number, FsmState>();
    private readonly _events = new Map<number, FsmEvent>();
    private readonly _initialStates = new Map<string, FsmState>();
    private _allowSelfTransition = true;

    static createNewFiniteStateMachine(fsmName: string): FiniteStateMachine {
        return new FiniteStateMachine(fsmName);
    }

    private constructor(private readonly _name: string, private _listener: FSMListener | null = null) {
    }

    clearAll(): void {
        this._states.clear();
        this._events.clear();
        this._initialStates.clear();
    }

    isEmpty() {
        return (this._states.size === 0) && (this._events.size === 0) && (this._initialStates.size === 0);
    }

    get name() {
        return this._name;
    }

    get allowSelfTransition() {
        return this._allowSelfTransition;
    }

    set allowSelfTransition(allow: boolean) {
        this._allowSelfTransition = allow;
    }

    getInitialState(fsmRegionName?: string): FsmState | null {
        if (!fsmRegionName) {
            fsmRegionName = this._name;
        }

        return this._initialStates.get(fsmRegionName) || null;
    }

    setInitialState(state: FsmState, fsmRegionName?: string): boolean {
        if (!fsmRegionName) {
            fsmRegionName = this._name;
        }

        const lookup = this.getState(state.stateId, state.stateName);
        if (!lookup) {
            return false;
        }

        const currentInitialState = this._initialStates.get(fsmRegionName);
        if (currentInitialState) {
            currentInitialState.unmarkInitial();
        }

        this._initialStates.set(fsmRegionName, lookup.markInitial(fsmRegionName));
        return true;
    }

    getState(state: number | string, stateName?: string): FsmState | null {
        if (typeof stateName !== "undefined") {
            if (typeof state === "number") {
                const stateObj = this._states.get(state) || null;
                return (stateObj && stateObj.stateName === stateName) ? stateObj : null;
            } else {
                return null;
            }
        }

        if (typeof state === "number") {
            return this._states.get(state) || null;
        } else if (typeof state === "string") {
            for (const stateObj of this._states.values()) {
                if (stateObj.stateName === state) {
                    return stateObj;
                }
            }
            return null;
        } else {
            return null;
        }
    }

    addState(stateName: string, stateId?: number) {
        if (typeof stateId === "undefined" || stateId === null) {
            stateId = this._states.size;
        }

        const newState = new FsmState(this._name, stateId, stateName);
        if (this._states.has(stateId)) {
            throw new Error(`Invalid action: duplicate state: ${newState}[${this._name}]`);
        }

        this._states.set(stateId, newState);
        if (this._initialStates.size === 0) {
            this.setInitialState(newState);
        }
        return newState;
    }

    addFinalState(stateName: string, stateId?: number) {
        if (typeof stateId === "undefined" || stateId === null) {
            stateId = this._states.size
        };

        const newFinalState = new FsmState(this._name, stateId, stateName, true);
        if (this._states.has(stateId)) {
            throw new Error(`Invalid action: duplicate state: ${newFinalState}[${this._name}]`);
        }

        this._states.set(stateId, newFinalState);
        if (this._initialStates.size === 0) {
            this.setInitialState(newFinalState);
        }
        return newFinalState;
    }

    getEvent(event: number | string, eventName?: string): FsmEvent | null {
        if (typeof eventName !== "undefined") {
            if (typeof event === "number") {
                const eventObj = this._events.get(event) || null;
                return (eventObj && eventObj.eventName === eventName) ? eventObj : null;

            } else {
                return null;
            }
        }

        if (typeof event === "number") {
            return this._events.get(event) || null;
        } else if (typeof event === "string") {
            for (const eventObj of this._events.values()) {
                if (eventObj.eventName === event) {
                    return eventObj;
                }
            }
            return null;
        } else {
            return null;
        }
    }

    addEvent(eventName: string, eventId?: number) {
        if (typeof eventId === "undefined" || eventId === null) {
            eventId = this._events.size
        };

        const newEvent = new FsmEvent(eventId, eventName);
        if (this._events.has(eventId)) {
            throw new Error(`Invalid action: duplicate event: ${newEvent}[${this._name}]`);
        }
        this._events.set(eventId, newEvent);
        return newEvent;
    }

    addStateTransition(currentState: FsmState | number | string, onEvent: FsmEvent | number | string, nextState: FsmState | number | string): FiniteStateMachine {
        const currentStateObj = (currentState instanceof FsmState) ? currentState : this.getState(currentState);
        const onEventObj = (onEvent instanceof FsmEvent) ? onEvent : this.getEvent(onEvent);
        const nextStateObj = (nextState instanceof FsmState) ? nextState : this.getState(nextState);

        if (!currentStateObj || !onEventObj || !nextStateObj) {
            throw new Error('Invalid action: cannot create state transition on incomplete input');
        }

        if (!this.allowSelfTransition && currentStateObj.equals(nextStateObj)) {
            throw new Error(`Invalid action: self transition disabled for ${currentState}[${this._name}]`);
        }

        currentStateObj.addTransition(onEventObj, nextStateObj);
        return this;
    }

    addStateTransitionForAllStates(onEvent: FsmEvent | number | string, nextState: FsmState | number | string): FiniteStateMachine {
        const onEventObj = (onEvent instanceof FsmEvent) ? onEvent : this.getEvent(onEvent);
        const nextStateObj = (nextState instanceof FsmState) ? nextState : this.getState(nextState);

        if (!onEventObj || !nextStateObj) {
            throw new Error('Invalid action: cannot create state transition on incomplete input');
        }

        this._states.forEach(state => {
            if (!state.isFinalState()) {
                try {
                    this.addStateTransition(state, onEventObj, nextStateObj);
                } catch (error) {
                    // ignore
                }
            }
        });
        return this;
    }

    removeStateTransition(currentState: FsmState | number | string, onEvent: FsmEvent | number | string): FiniteStateMachine {
        const currentStateObj = (currentState instanceof FsmState) ? currentState : this.getState(currentState);
        const onEventObj = (onEvent instanceof FsmEvent) ? onEvent : this.getEvent(onEvent);

        if (!currentStateObj || !onEventObj) {
            throw new Error('Invalid action: cannot remove state transition on incomplete input');
        }
        currentStateObj.removeTransition(onEventObj);
        return this;
    }

    removeAllStatesTransitionForEvent(onEvent: FsmEvent | number | string): FiniteStateMachine {
        const onEventObj = (onEvent instanceof FsmEvent) ? onEvent : this.getEvent(onEvent);

        if (!onEventObj) {
            throw new Error('Invalid action: cannot remove state transition on incomplete input');
        }

        this._states.forEach(state => {
            if (!state.isFinalState()) {
                try {
                    this.removeStateTransition(state, onEventObj);
                } catch (error) {
                    // ignore
                }
            }
        });
        return this;
    }

    nextState(currentState: FsmState | number | string, onEvent: FsmEvent | number | string): FsmState | null {
        const currentStateObj = (currentState instanceof FsmState) ? currentState : this.getState(currentState);
        const onEventObj = (onEvent instanceof FsmEvent) ? onEvent : this.getEvent(onEvent);

        if (!currentStateObj || !onEventObj) { return null; }
        return currentStateObj.nextState(onEventObj) || null;
    }

    isTransitionValid(currentState: FsmState | number | string, onEvent: FsmEvent | number | string, newState: FsmState | number | string): boolean {
        const currentStateObj = (currentState instanceof FsmState) ? currentState : this.getState(currentState);
        const onEventObj = (onEvent instanceof FsmEvent) ? onEvent : this.getEvent(onEvent);
        const newStateObj = (newState instanceof FsmState) ? newState : this.getState(newState);

        if (!currentStateObj || !onEventObj || !newStateObj) { return false; }
        return currentStateObj.hasNextStateOnEvent(onEventObj, newStateObj);
    }

    isTransitionValidByEvent(currentState: FsmState | number | string, onEvent: FsmEvent | number | string): boolean {
        const currentStateObj = (currentState instanceof FsmState) ? currentState : this.getState(currentState);
        const onEventObj = (onEvent instanceof FsmEvent) ? onEvent : this.getEvent(onEvent);

        if (!currentStateObj || !onEventObj) { return false; }
        return currentStateObj.isTransitionValid(onEventObj);
    }

    getStateTableString(separator?: string) {
        if (!separator) {
            separator = '';
        }
        let allStateTables = '';
        this._states.forEach(state => {
            allStateTables += `${separator}${state.getStateTableString(separator)}`;
        });
        return allStateTables;
    }

    toString() {
        let states = '';
        this._states.forEach(state => {
            states += `\t${state.toString()}\n`;
        });

        let events = '';
        this._events.forEach(event => {
            events += `\t${event.toString()}\n`;
        });

        return "FSM: " + this._name + "\n" +
            "STATES:\n" +
            states + "\n\n" +
            "EVENTS:\n" +
            events + "\n\n" +
            "STATE TABLE:\n" +
            this.getStateTableString('\t') + "\n";
    }

}
