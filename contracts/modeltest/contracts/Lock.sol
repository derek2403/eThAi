// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract AIQueryResponse {
    // Structure to store query and response data
    struct Conversation {
        address user;
        string query;
        string response;
        uint256 timestamp;
        bool hasResponse;
    }

    // Array to store all conversations
    Conversation[] public conversations;
    
    // Mapping from conversation ID to user address
    mapping(uint256 => address) public conversationToUser;
    
    // Events
    event QuerySubmitted(uint256 indexed conversationId, address indexed user, string query);
    event ResponseReceived(uint256 indexed conversationId, string response);
    
    // Submit a new query
    function submitQuery(string memory _query) public returns (uint256) {
        uint256 conversationId = conversations.length;
        
        conversations.push(Conversation({
            user: msg.sender,
            query: _query,
            response: "",
            timestamp: block.timestamp,
            hasResponse: false
        }));
        
        conversationToUser[conversationId] = msg.sender;
        
        emit QuerySubmitted(conversationId, msg.sender, _query);
        
        return conversationId;
    }
    
    // Submit response (only authorized AI model address can call this)
    function submitResponse(uint256 _conversationId, string memory _response) public {
        require(_conversationId < conversations.length, "Invalid conversation ID");
        require(!conversations[_conversationId].hasResponse, "Response already exists");
        
        Conversation storage conversation = conversations[_conversationId];
        conversation.response = _response;
        conversation.hasResponse = true;
        
        emit ResponseReceived(_conversationId, _response);
    }
    
    // Get conversation by ID
    function getConversation(uint256 _conversationId) public view returns (
        address user,
        string memory query,
        string memory response,
        uint256 timestamp,
        bool hasResponse
    ) {
        require(_conversationId < conversations.length, "Invalid conversation ID");
        Conversation storage conversation = conversations[_conversationId];
        
        return (
            conversation.user,
            conversation.query,
            conversation.response,
            conversation.timestamp,
            conversation.hasResponse
        );
    }
    
    // Get total number of conversations
    function getConversationCount() public view returns (uint256) {
        return conversations.length;
    }
    
    // Get user's conversations
    function getUserConversations(address _user) public view returns (uint256[] memory) {
        uint256 count = 0;
        
        // First, count the number of conversations for this user
        for (uint256 i = 0; i < conversations.length; i++) {
            if (conversations[i].user == _user) {
                count++;
            }
        }
        
        // Create array of correct size
        uint256[] memory userConversationIds = new uint256[](count);
        uint256 currentIndex = 0;
        
        // Fill the array with conversation IDs
        for (uint256 i = 0; i < conversations.length; i++) {
            if (conversations[i].user == _user) {
                userConversationIds[currentIndex] = i;
                currentIndex++;
            }
        }
        
        return userConversationIds;
    }
}