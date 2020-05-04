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

        if (this._initialStates.has(fsmRegionName)) {
            throw new Error(`Invalid action: initial state already set for region: ${fsmRegionName}`);
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

    getState(state: string | number, stateName?: string): FsmState | null {
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
        } else {
            for (const stateObj of this._states.values()) {
                if (stateObj.stateName === state) {
                    return stateObj;
                }
            }
            return null;

        }
    }

    addState(stateName: string, stateId?: number) {
        if (!stateId) { stateId = this._states.size; }

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
        if (!stateId) { stateId = this._states.size };

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

    getEvent(eventId: number, eventName: string): FsmEvent | null {
        const event = this._events.get(eventId) || null;
        return (event && event.eventName === eventName) ? event : null;
    }

    getEventById(eventId: number): FsmEvent | null {
        return this._events.get(eventId) || null;
    }

    getEventByName(eventName: string): FsmEvent | null {
        for (const event of this._events.values()) {
            if (event.eventName === eventName) {
                return event;
            }
        }
        return null;
    }

    addEvent(eventName: string, eventId?: number) {
        if (!eventId) { eventId = this._events.size };

        const newEvent = new FsmEvent(eventId, eventName);
        if (this._events.has(eventId)) {
            throw new Error(`Invalid action: duplicate event: ${newEvent}[${this._name}]`);
        }
        this._events.set(eventId, newEvent);
        return newEvent;
    }

    addStateTransition(currentState: FsmState | null, onEvent: FsmEvent | null, nextState: FsmState | null): void {
        if (!currentState || !onEvent || !nextState) {
            throw new Error('Invalid action: cannot create state transition on incomplete input');
        }

        if (!this.allowSelfTransition && currentState.equals(nextState)) {
            throw new Error(`Invalid action: self transition disabled for ${currentState}[${this._name}]`);
        }

        currentState.addTransition(onEvent, nextState);
    }

    addStateTransitionById(currentState: number, onEvent: number, nextState: number): void {
        this.addStateTransition(this.getStateById(currentState), this.getEventById(onEvent), this.getStateById(nextState));
    }

    addStateTransitionByName(currentState: string, onEvent: string, nextState: string): void {
        this.addStateTransition(this.getStateByName(currentState), this.getEventByName(onEvent), this.getStateByName(nextState));
    }

    addStateTransitionForAllStates(onEvent: FsmEvent | null, nextState: FsmState | null): void {
        if (!onEvent || !nextState) {
            throw new Error('Invalid action: cannot create state transition on incomplete input');
        }

        this._states.forEach(state => {
            if (!state.isFinalState()) {
                try {
                    this.addStateTransition(state, onEvent, nextState);
                } catch (error) {
                    // ignore
                }
            }
        });
    }

    addStateTransitionForAllStatesById(onEvent: number, nextState: number): void {
        this.addStateTransitionForAllStates(this.getEventById(onEvent), this.getStateById(nextState));
    }

    addStateTransitionForAllStatesByName(onEvent: string, nextState: string): void {
        this.addStateTransitionForAllStates(this.getEventByName(onEvent), this.getStateByName(nextState));
    }

    removeStateTransition(currentState: FsmState | null, onEvent: FsmEvent | null): void {
        if (!currentState || !onEvent) {
            throw new Error('Invalid action: cannot remove state transition on incomplete input');
        }

        currentState.removeTransition(onEvent);
    }

    removeStateTransitionById(currentState: number, onEvent: number): void {
        this.removeStateTransition(this.getStateById(currentState), this.getEventById(onEvent));
    }

    removeStateTransitionByName(currentState: string, onEvent: string): void {
        this.removeStateTransition(this.getStateByName(currentState), this.getEventByName(onEvent));
    }

    removeStateTransitionForAllStates(onEvent: FsmEvent | null): void {
        if (!onEvent) {
            throw new Error('Invalid action: cannot remove state transition on incomplete input');
        }

        this._states.forEach(state => {
            if (!state.isFinalState()) {
                try {
                    this.removeStateTransition(state, onEvent);
                } catch (error) {
                    // ignore
                }
            }
        });
    }

    removeStateTransitionForAllStatesById(onEvent: number): void {
        this.removeStateTransitionForAllStates(this.getEventById(onEvent));
    }

    removeStateTransitionForAllStatesByName(onEvent: string): void {
        this.removeStateTransitionForAllStates(this.getEventByName(onEvent));
    }

    nextState(currentState: FsmState | null, onEvent: FsmEvent | null): FsmState | null {
        if (!currentState || !onEvent) { return null; }

        return currentState.nextState(onEvent) || null;
    }

    nextStateById(currentState: number, onEvent: number): FsmState | null {
        return this.nextState(this.getStateById(currentState), this.getEventById(onEvent));
    }

    nextStateByName(currentState: string, onEvent: string): FsmState | null {
        return this.nextState(this.getStateByName(currentState), this.getEventByName(name));
    }

    isTransitionValid(currentState: FsmState | null, onEvent: FsmEvent | null, newState: FsmState | null): boolean {
        if (!currentState || !onEvent || !newState) { return false; }
        return currentState.hasNextStateOnEvent(onEvent, newState);
    }

    isTransitionValidById(currentState: number, onEvent: number, newState: number): boolean {
        return this.isTransitionValid(this.getStateById(currentState), this.getEventById(onEvent), this.getStateById(newState));
    }

    isTransitionValidByName(currentState: string, onEvent: string, newState: string): boolean {
        return this.isTransitionValid(this.getStateByName(currentState), this.getEventByName(onEvent), this.getStateByName(newState));
    }

    isTransitionValidByEvent(currentState: FsmState | null, onEvent: FsmEvent | null): boolean {
        if (!currentState || !onEvent) { return false; }
        return currentState.isTransitionValid(onEvent);
    }

    isTransitionValidByEventId(currentState: number, onEvent: number): boolean {
        return this.isTransitionValidByEvent(this.getStateById(currentState), this.getEventById(onEvent));
    }

    isTransitionValidByEventName(currentState: string, onEvent: string): boolean {
        return this.isTransitionValidByEvent(this.getStateByName(currentState), this.getEventByName(onEvent));
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