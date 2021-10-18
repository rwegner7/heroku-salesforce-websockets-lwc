import {LightningElement, api} from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { loadScript } from 'lightning/platformResourceLoader';
import { getRecordNotifyChange } from 'lightning/uiRecordApi';
import SOCKET_IO_JS from '@salesforce/resourceUrl/socketiojs';
import USER_ID from '@salesforce/user/Id';
import SOCKETURL from '@salesforce/label/c.websocket_server_url';

/*--------- UTILS ----------------------------------------------------------*/
const showToast = (variant = 'info', mode = 'dismissable', title, message) => {
    return new ShowToastEvent({
        variant: variant,
        mode: mode,
        title: title,
        message: message,
        duration: 1000
    });
};

const setValueIfEmpty = (val,dummy) => {
    return !val || val === '' ? dummy : val;
};

export default class WebSocketListener extends LightningElement {
    @api recordId; //record id, used on record edit form or record page
    _socketIoInitialized = false;
    _socket;
    _recordId;
    _message;
    _submittedBy;
    _description;
    _externalId;
    _payload1;
    _payload2;
    _payload3;
    _objectName;
    _fieldNames;
    _heading;
    WEBSOCKET_SERVER_URL = SOCKETURL;

    /*--------- LIFECYCLE EVENTS ----------------------------------------------------------*/
    renderedCallback() {
        if(!this._socketIoInitialized){
            this._socketIoInitialized = true;
            Promise.all([loadScript(this,SOCKET_IO_JS)])
                .then(() => {this.initSocketIO();})
                .catch(error => console.error('Error loading socket script'))
        }
    }

    /*--------- SOCKET LISTENER ----------------------------------------------------------*/
    initSocketIO(){
        // eslint-disable-next-line no-undef
        this._socket = io.connect(this.WEBSOCKET_SERVER_URL, {transports: ['websocket','polling']}); //use websockets first if available
        this._socket.on('connect', () => {
            console.log('Socket.io is connected: ', this._socket.connected);
        });
        this._socket.on('connect_error', () => {
            this._socket.io.opts.transports = ['polling','websocket']; //revert to long polling if there is a connection error
        });

        this._socket.on('message', (data) => {
            this.handleMessage(data);
        });
    }

    /*--------- MESSAGE HANDLERS ----------------------------------------------------------*/
    handleMessage(data){
        if(data){
            const result = JSON.parse(data);
            this._recordId = setValueIfEmpty(result.payload.SalesforceId__c,''); //sample data: '0015w0000299PWfAAM'
            this._externalId = setValueIfEmpty(result.payload.ExternalId__c,''); //sample data: 'ABC12345'
            this._objectName = setValueIfEmpty(result.payload.ObjectAPIName__c,''); //sample data: 'Account','Case','MyObject__c'
            this._fieldNames = setValueIfEmpty(result.payload.FieldAPINames__c,''); //sample data: 'BillingState,BillingCity,CustomerId__c'
            this._heading = setValueIfEmpty(result.payload.Heading__c,''); //sample data: 'New Opportunity'
            this._description = setValueIfEmpty(result.payload.Description__c,''); //sample data: 'Opportunity created in NW Region for Account ACME'
            this._payload1 = setValueIfEmpty(result.payload.PrimaryPayload__c,'');  //sample data: '{"widget": {"id":"67890","items":[{"foo":"bar"},{"foo":"bar"}]}}', use JSON.parse(this._payload1) to convert json string to object
            this._payload2 = setValueIfEmpty(result.payload.SecondaryPayload__c,''); //sample data: same as primary payload, use JSON.parse(this._payload2) to convert json string to object
            this._payload3 = setValueIfEmpty(result.payload.TertiaryPayload__c,''); //sample data: same as primary payload, use JSON.parse(this._payload3) to convert json string to object
            this._submittedBy = setValueIfEmpty(result.payload.SubmittedBy__c,''); //sample data: '0055w00000BxS2V'
            
            //EX: HANDLE MESSAGE WITH BUBBLE EVENT - notifies parent of message data
            const messageEvent = new CustomEvent('messageReceived',{
                detail: {'message':data}
            });
            this.dispatchEvent(messageEvent);

        }else{
            return;
        }

        //EX: HANDLE MESSAGE WITH CACHE REFRESH - signal that the data for the provided recordIDs has changed, so that the Lightning Data Service cache and wires are refreshed.
        if(this._recordId !== ''){
            getRecordNotifyChange([{recordId: this._recordId}]);
        }

        //EX: HANDLE MESSAGE WITH CUSTOM HANDLER PER OBJECT
        switch (this._objectName) {
            case 'Case':
                this.handleCase();
                break;
            //no default
        }
    }

    handleCase(){
        //create toast message to notify user of case update
        const variant = isCurrentUser ? 'success' : 'info';
        this.dispatchEvent(
            showToast('info','dismissible','Case Message Received for: ' + this._recordId, this._payload1 + ' Submitter: ' + this._submittedBy)
        );
    }
}