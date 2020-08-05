import { FsmState } from "./fsm-state";
import { FsmEvent } from "./fsm-event";
import { EventEmitter } from 'events';

export enum FsmListenerEvent {
    onFsmCleared = 'fsm.cleared',
    onNewInitialStateAdded = 'fsm.state.initial.added',
    onNewFinalStateAdded = 'fsm.state.final.added',
    onNewStateAdded = 'fsm.state.added',
    onNewEventAdded = 'fsm.event.added',
    onNewTransitionAdded = 'fsm.transit.added',
    onInitialStateRemoved = 'fsm.state.initial.removed',
    onStateRemoved = 'fsm.state.removed',
    onEventRemoved = 'fsm.event.removed',
    onTransitionRemoved = 'fsm.transition.removed',
}

export enum TokenListenerEvent {
    onTokenCreated = 'token.new',
    onTokenTransitNonDeterministic = 'token.transit.nd',
    onTokenTransitSelf = 'token.state.changed.self',
    onTokenTransitState = 'token.state.changed',
    onTokenStateFinal = 'token.state.final',
    onTokenInvalidStateChange = 'token.state.invalid.change',
    onErrorTokenIdNotFound = 'error.notfound.tokenid',
    onErrorStateNotFound = 'error.notfound.state',
    onErrorEventNotFound = 'error.notfound.event',
    onErrorNdStateTableNotFound = 'error.notfound.statetable.nd',
}

export type NonDeterministicStateTable = (tokenId: string, currentState: FsmState, onEvent: FsmEvent) => FsmState | null;

export class FiniteStateMachine {

    private readonly _states = new Map<number, FsmState>();
    private readonly _events = new Map<number, FsmEvent>();
    private readonly _initialStates = new Map<string, FsmState>();
    private readonly _tokenInstances = new Map<string, FsmState>();
    private readonly _internalListener = new EventEmitter();
    private _allowSelfTransition = true;

    static createNewFiniteStateMachine(fsmName: string): FiniteStateMachine {
        return new FiniteStateMachine(fsmName);
    }

    private constructor(private readonly _name: string, private _listener?: EventEmitter) {
        this._internalListener.on('error', (error) => {
            console.log(`${this._name}:Error: ${error}`);
        });
    }

    clearAll(): void {
        this._states.clear();
        this._events.clear();
        this._initialStates.clear();
        this._internalListener.emit(FsmListenerEvent.onFsmCleared, this);
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
            this._internalListener.emit(FsmListenerEvent.onInitialStateRemoved, currentInitialState, fsmRegionName);
            currentInitialState.unmarkInitial();
        }

        this._initialStates.set(fsmRegionName, lookup.markInitial(fsmRegionName));
        this._internalListener.emit(FsmListenerEvent.onNewInitialStateAdded, lookup, fsmRegionName);
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
        this._internalListener.emit(FsmListenerEvent.onNewStateAdded, newState);
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
        this._internalListener.emit(FsmListenerEvent.onNewFinalStateAdded, newFinalState);
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
        this._internalListener.emit(FsmListenerEvent.onNewEventAdded, newEvent);
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
        this._internalListener.emit(FsmListenerEvent.onNewTransitionAdded, currentStateObj, onEventObj, nextStateObj);
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
        this._internalListener.emit(FsmListenerEvent.onTransitionRemoved, currentStateObj, onEventObj);
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

    createTokenInstance(tokenId: string, fsmRegionName?: string): FsmState {
        if (!tokenId?.trim()) {
            throw new Error('Invalid action: invalid tokenId');
        }
        if (this._tokenInstances.has(tokenId)) {
            throw new Error(`Invalid action: token instance ${tokenId} exists`);
        }
        const token = this.getInitialState(fsmRegionName);
        if (!token) {
            throw new Error(`No initial state for ${fsmRegionName ?? this._name}`);
        }
        this._tokenInstances.set(tokenId, token);
        this._listener?.emit(TokenListenerEvent.onTokenCreated, tokenId, token);
        return token;
    }

    getTokenInstance(tokenId: string, autoCreate = true, fsmRegionName?: string): FsmState {
        if (!tokenId?.trim()) {
            this._listener?.emit(TokenListenerEvent.onErrorTokenIdNotFound, tokenId);
            throw new Error('Invalid action: invalid tokenId');
        }
        let token = this._tokenInstances.get(tokenId) || null;
        if (!token) {
            if (!autoCreate) {
                this._listener?.emit(TokenListenerEvent.onErrorTokenIdNotFound, tokenId);
                throw new Error(`Token instance ${tokenId} not exists`);
            }
            token = this.createTokenInstance(tokenId, fsmRegionName);
        }
        return token;
    }

    updateTokenToNextState(tokenId: string, onEvent: FsmEvent | number | string, altStateTable?: NonDeterministicStateTable): FsmState {
        const tokenInstance = this.getTokenInstance(tokenId);
        const event = onEvent instanceof FsmEvent ? onEvent : this.getEvent(onEvent);
        if (!event) {
            this._listener?.emit(TokenListenerEvent.onErrorEventNotFound, tokenId, tokenInstance, onEvent);
            throw new Error('Invalid action: invalid onEvent');
        }

        let tableType = '';
        let nextState = this.nextState(tokenInstance, event);
        if (nextState && !nextState.isDeterministic()) {
            tableType = 'ND';
            if (!altStateTable) {
                this._listener?.emit(TokenListenerEvent.onErrorNdStateTableNotFound, tokenId, tokenInstance, onEvent, nextState);
                throw new Error(`Invalid${tableType}StateTable:- tokenId:${tokenId} currentState:${tokenInstance.stateName}[${tokenInstance.stateId}] onEvent:${onEvent}`);
            }
            this._listener?.emit(TokenListenerEvent.onTokenTransitNonDeterministic, tokenId, tokenInstance, event, nextState);
            nextState = altStateTable(tokenId, tokenInstance, event);
        }
        if (!nextState) {
            this._listener?.emit(TokenListenerEvent.onTokenInvalidStateChange, tokenId, tokenInstance, event);
            throw new Error(`Invalid${tableType}StateChange:- tokenId:${tokenId} currentState:${tokenInstance.stateName}[${tokenInstance.stateId}] onEvent:${onEvent}`);
        }

        if (tokenInstance.equals(nextState)) {
            this._listener?.emit(TokenListenerEvent.onTokenTransitSelf, tokenId, tokenInstance, event, nextState);
        } else {
            this._listener?.emit(nextState.isFinalState() ? TokenListenerEvent.onTokenStateFinal : TokenListenerEvent.onTokenTransitState, tokenId, tokenInstance, event, nextState);
        }
        this._tokenInstances.set(tokenId, nextState);
        return nextState;
    }

    get internalListener() {
        return this._internalListener;
    }

    get listener() {
        return this._listener || (this._listener = new EventEmitter());
    }

    set listener(newListener: EventEmitter) {
        this._listener = newListener;
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
