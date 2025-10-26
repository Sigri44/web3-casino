// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Casino {
    address public owner;
    uint256 public minEntry;
    uint256 public roundDuration;
    uint256 public currentRoundId;
    
    struct Round {
        uint256 id;
        uint256 startTime;
        uint256 totalPot;
        address[] players;
        mapping(address => uint256) contributions;
        address winner;
        bool drawn;
    }
    
    mapping(uint256 => Round) public rounds;
    address[] private currentPlayers;
    uint256 public collectedFees;
    
    event PlayerEntered(address indexed player, uint256 amount, uint256 roundId);
    event RoundDrawn(uint256 indexed roundId, address indexed winner, uint256 prize);
    event NewRoundStarted(uint256 indexed roundId, uint256 startTime);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(uint256 _minEntry, uint256 _roundDuration) {
        owner = msg.sender;
        minEntry = _minEntry;
        roundDuration = _roundDuration;
        _startNewRound();
    }
    
    function enter() external payable {
        require(msg.value >= minEntry, "Entry too small");
        Round storage round = rounds[currentRoundId];
        require(!round.drawn, "Round already drawn");
        
        if (round.contributions[msg.sender] == 0) {
            round.players.push(msg.sender);
            currentPlayers.push(msg.sender);
        }
        
        round.contributions[msg.sender] += msg.value;
        round.totalPot += msg.value;
        
        emit PlayerEntered(msg.sender, msg.value, currentRoundId);
    }
    
    function drawWinner() external {
        Round storage round = rounds[currentRoundId];
        require(block.timestamp >= round.startTime + roundDuration, "Round not finished");
        require(!round.drawn, "Already drawn");
        require(round.players.length > 0, "No players");
        
        // Génération aléatoire (note: utiliser Chainlink VRF en production)
        uint256 randomIndex = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            round.players.length
        ))) % round.players.length;
        
        address winner = round.players[randomIndex];
        round.winner = winner;
        round.drawn = true;
        
        // 95% au gagnant, 5% en fees
        uint256 prize = (round.totalPot * 95) / 100;
        uint256 fee = round.totalPot - prize;
        
        collectedFees += fee;
        
        payable(winner).transfer(prize);
        
        emit RoundDrawn(currentRoundId, winner, prize);
        
        _startNewRound();
    }
    
    function _startNewRound() private {
        currentRoundId++;
        Round storage newRound = rounds[currentRoundId];
        newRound.id = currentRoundId;
        newRound.startTime = block.timestamp;
        delete currentPlayers;
        
        emit NewRoundStarted(currentRoundId, block.timestamp);
    }
    
    function getCurrentPlayers() external view returns (address[] memory) {
        return currentPlayers;
    }
    
    function getCurrentPot() external view returns (uint256) {
        return rounds[currentRoundId].totalPot;
    }
    
    function getPlayerContribution(address player) external view returns (uint256) {
        return rounds[currentRoundId].contributions[player];
    }
    
    function getRoundInfo(uint256 roundId) external view returns (
        uint256 id,
        uint256 startTime,
        uint256 totalPot,
        address winner,
        bool drawn,
        uint256 playerCount
    ) {
        Round storage round = rounds[roundId];
        return (
            round.id,
            round.startTime,
            round.totalPot,
            round.winner,
            round.drawn,
            round.players.length
        );
    }
    
    function canDraw() external view returns (bool) {
        Round storage round = rounds[currentRoundId];
        return block.timestamp >= round.startTime + roundDuration 
            && !round.drawn 
            && round.players.length > 0;
    }
    
    function withdrawFees() external onlyOwner {
        uint256 amount = collectedFees;
        collectedFees = 0;
        payable(owner).transfer(amount);
    }
    
    function updateMinEntry(uint256 _minEntry) external onlyOwner {
        minEntry = _minEntry;
    }
    
    function updateRoundDuration(uint256 _roundDuration) external onlyOwner {
        roundDuration = _roundDuration;
    }
}