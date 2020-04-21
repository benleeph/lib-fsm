export class FsmEvent {

    constructor(private readonly _eventId: number, private _eventName: string) { }

    get eventId() {
        return this._eventId;
    }

    get eventName() {
        return this._eventName;
    }

    equals(otherEvent?: FsmEvent) {
        if (otherEvent) {
            return (this._eventId === otherEvent._eventId) && (this._eventName === otherEvent._eventName);
        }
        return false;
    }

    toString() {
        return `${this._eventName}(${this._eventId})`;
    }

}
