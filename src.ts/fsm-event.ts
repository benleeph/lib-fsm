export class FsmEvent {

    constructor(private readonly _eventId: number, private _eventName: string) { }

    get eventId() {
        return this._eventId;
    }

    get eventName() {
        return this._eventName;
    }

    equals(otherEvent?: FsmEvent | number | string) {
        if (otherEvent instanceof FsmEvent) {
            return this._eventId === otherEvent._eventId && this._eventName === otherEvent._eventName;
        } else if (typeof otherEvent === "number") {
            return this._eventId === otherEvent;
        } else if (typeof otherEvent === "string") {
            return this._eventName === otherEvent;
        } else {
            return false;
        }
    }

    toString() {
        return `${this._eventName}(${this._eventId})`;
    }

}
