import { FiniteStateMachine, FsmState, FsmEvent, FsmListenerEvent, TokenListenerEvent } from "../src.ts";


const fsm = FiniteStateMachine.createNewFiniteStateMachine('trafficLight');

fsm.internalListener.on(FsmListenerEvent.onNewStateAdded, newState => {
    console.log(`newState added: ${newState}`);
});

fsm.internalListener.on(FsmListenerEvent.onNewEventAdded, newEvent => {
    console.log(`newEvent added: ${newEvent}`);
});

fsm.listener.on(TokenListenerEvent.onTokenCreated, (tokenId, token) => {
    console.log(`tokenId:${tokenId} created ==> ${token}`);
});

fsm.listener.on(TokenListenerEvent.onTokenInvalidStateChange, (tokenId, token, onEvent) => {
    console.log(`InvalidStateChange: tokenId:${tokenId} currentState ==> ${token} event:${onEvent}`);
});

fsm.listener.on(TokenListenerEvent.onTokenInvalidOutputResult, (tokenId, token, onEvent) => {
    console.log(`InvalidOutputResult: tokenId:${tokenId} currentState ==> ${token} event:${onEvent}`);
});

fsm.listener.on(TokenListenerEvent.onTokenTransitState, (tokenId, token, onEvent, nextState) => {
    console.log(`StateChanged: tokenId:${tokenId} currentState ==> ${token} event:${onEvent} nextState:${nextState}`);
});

fsm.listener.on(TokenListenerEvent.onTokenTransitFinalState, (tokenId, token, onEvent, nextState) => {
    console.log(`FinalState: tokenId:${tokenId} currentState ==> ${token} event:${onEvent} nextState:${nextState}`);
});

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

fsm.getState('Red')
    ?.addTransition(fsm.getEvent('NoCar'), greenLight)
    ?.addTransition(fsm.getEvent('Secs_60'), greenLight, () => {
        const light = fsm.getTokenInstance('trafficLight');
        console.log(`\t${light} beeping`);
        //throw new Error('traffic light breakdown');
    })
    ?.addTransition(fsm.getEvent('Secs_600'), damaged)
    ;

yellowLight.addTransition(fsm.getEvent(10), fsm.getState('Red'));
yellowLight.addTransition(fsm.getEvent('Secs_60'), fsm.getState(-1));
yellowLight.addTransition(veryLongTime, damaged);

fsm.addStateTransition('Green', 'Secs_90', 'Yellow');
fsm.addStateTransition(999, 0, 999);
fsm.addStateTransition(greenLight, veryLongTime, damaged);

try {
    damaged.addTransition(veryLongTime, redLight);
} catch (error) {
    console.log('Damaged Traffic Light cannot be used');
}

console.log('\n*** Printing FSM');
console.log(fsm.toString());

// run the traffic light
console.log('*** Running FSM v1.0');
let trafficLight = fsm.getInitialState();
trafficLight = showTrafficLight(trafficLight);
trafficLight = showTrafficLight(trafficLight, fsm.getEvent(0));
for (let i = 0; i < 3; ++i) {
    trafficLight = showTrafficLight(trafficLight, fsm.getEvent('Secs_10'));
    trafficLight = showTrafficLight(trafficLight, fsm.getEvent('Secs_60'));
    trafficLight = showTrafficLight(trafficLight, fsm.getEvent('Secs_90'));
}
trafficLight = showTrafficLight(trafficLight, fsm.getEvent('Secs_10'));
trafficLight = showTrafficLight(trafficLight, fsm.getEvent('Secs_90'));
trafficLight = showTrafficLight(trafficLight, fsm.getEvent('Secs_600'));
trafficLight = showTrafficLight(trafficLight, fsm.getEvent('Secs_600'));
trafficLight = showTrafficLight(trafficLight, fsm.getEvent('Secs_600'));
trafficLight = showTrafficLight(trafficLight, fsm.getEvent('Secs_600'));

console.log('\n\n*** Running FSM v1.1');
fsm.createTokenInstance('trafficLight');
try {
    fsm.updateTokenToNextState('trafficLight', fsm.getEvent('Secs_60'));
    fsm.updateTokenToNextState('trafficLight', fsm.getEvent('Secs_90'));
    fsm.updateTokenToNextState('trafficLight', fsm.getEvent('Secs_10'));
} catch (error) {
    const currentState = fsm.getTokenInstance('trafficLight');
    console.log(`Error found, currentState is ${currentState}`);
}

console.log('\n\nTerminating Traffic Light FSM');
