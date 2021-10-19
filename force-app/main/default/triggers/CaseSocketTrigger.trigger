trigger CaseSocketTrigger on Case (before update) {
    /* A simple trigger to create a message for case updates */

    //create message list to publish
    List<SocketMessage__e> socketMessages = new List<SocketMessage__e>();

    //loop over updated cases, create a message for each one
    for(Case c : Trigger.new){
        socketMessages.add(new SocketMessage__e(
                Heading__c = 'Case Update',
                Description__c = 'Case record updated: ',
                PrimaryPayload__c = 'Updated by: ' +  UserInfo.getName(),
                ObjectAPIName__c = 'Case',
                SalesforceId__c = c.Id,
                SubmittedBy__c = UserInfo.getUserId()
        ));
    }

    //publish messages
    if(socketMessages.size() > 0){
        System.debug('publishing messages');
        EventBus.publish(socketMessages);
    }
}