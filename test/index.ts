import { FiniteStateMachine, FsmState, FsmEvent } from "../src.ts";


const fsm = FiniteStateMachine.createNewFiniteStateMachine('trafficLight');

const showTrafficLight = function (traffic: FsmState | null, onEvent: FsmEvent | null = null): FsmState | null {
    if (!traffic) { return null };

    if (onEvent) {
        var nextState = fsm.nextState(traffic, onEvent);
        if (nextState) {
            console.log(`OnEvent ${onEvent.eventName}: ${traffic.stateName} --> ${nextState.stateName}`)
            traffic = nextState;
        } else {
            console.log(`Do nothing on ${onEvent.eventName}, Traffic Light still := ${traffic}`);
        }
    }
    return traffic;
};

console.log('*** Starting FSM for Traffic Light');

const redLight = fsm.addState('Red');
const yellowLight = fsm.addState('Yellow');
const greenLight = fsm.addState('Green', 999);
const damaged = fsm.addFinalState('Damaged', -1);

fsm.addEvent('NoCar');
fsm.addEvent('Secs_10', 10);
fsm.addEvent('Secs_60', 60);
fsm.addEvent('Secs_90', 90);
const veryLongTime = fsm.addEvent('Secs_600', 600);

fsm.getStateByName('Red')
    ?.addTransition(fsm.getEventByName('NoCar'), greenLight)
    ?.addTransition(fsm.getEventByName('Secs_60'), greenLight)
    ?.addTransition(fsm.getEventByName('Secs_600'), damaged)
    ;

yellowLight.addTransition(fsm.getEventById(10), fsm.getStateByName('Red'));
yellowLight.addTransition(fsm.getEventByName('Secs_60'), fsm.getStateById(-1));
yellowLight.addTransition(veryLongTime, damaged);

fsm.addStateTransitionByName('Green', 'Secs_90', 'Yellow');
fsm.addStateTransitionById(999, 0, 999);
fsm.addStateTransition(greenLight, veryLongTime, damaged);

try {
    damaged.addTransition(veryLongTime, redLight);
} catch (error) {
    console.log('Damaged Traffic Light cannot be used');
}

console.log('\n*** Printing FSM');
console.log(fsm.toString());

// run the traffic light
console.log('*** Running FSM');
let trafficLight = fsm.getInitialState();
trafficLight = showTrafficLight(trafficLight);
trafficLight = showTrafficLight(trafficLight, fsm.getEventById(0));
for (let i = 0; i < 3; ++i) {
    trafficLight = showTrafficLight(trafficLight, fsm.getEventByName('Secs_10'));
    trafficLight = showTrafficLight(trafficLight, fsm.getEventByName('Secs_60'));
    trafficLight = showTrafficLight(trafficLight, fsm.getEventByName('Secs_90'));
}
trafficLight = showTrafficLight(trafficLight, fsm.getEventByName('Secs_10'));
trafficLight = showTrafficLight(trafficLight, fsm.getEventByName('Secs_90'));
trafficLight = showTrafficLight(trafficLight, fsm.getEventByName('Secs_600'));
trafficLight = showTrafficLight(trafficLight, fsm.getEventByName('Secs_600'));
trafficLight = showTrafficLight(trafficLight, fsm.getEventByName('Secs_600'));
trafficLight = showTrafficLight(trafficLight, fsm.getEventByName('Secs_600'));

console.log('\n\nTerminating Traffic Light FSM');
