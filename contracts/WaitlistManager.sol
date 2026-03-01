// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

contract WaitlistManager {
    address public admin;
    address public immutable creator;

    // Dynamic array to store waitlist addresses
    address[] private waitlist;

    // Mapping from user address to their index in waitlist array + 1
    // Index stored as +1 to distinguish between existing and non-existing entries
    mapping(address => uint256) private waitlistIndex;

    event AddedToWaitlist(address indexed user);
    event RemovedFromWaitlist(address indexed user);
    event Prioritized(address indexed user);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor() {
        admin = msg.sender;
        creator = msg.sender;
    }

    // Add user to the end of waitlist if not present
    function addToWaitlist(address user) external onlyAdmin {
        require(user != address(0), "Invalid address");
        require(!_isInWaitlist(user), "Already in waitlist");

        waitlist.push(user);
        waitlistIndex[user] = waitlist.length; // store index + 1
        emit AddedToWaitlist(user);
    }

    // Remove user efficiently using mapping and swap-pop
    function removeFromWaitlist(address user) external onlyAdmin {
        require(_isInWaitlist(user), "User not in waitlist");

        uint256 index = waitlistIndex[user] - 1; // real index in array
        uint256 lastIndex = waitlist.length - 1;

        if (index != lastIndex) {
            // Move last element to the removed spot
            address lastUser = waitlist[lastIndex];
            waitlist[index] = lastUser;
            waitlistIndex[lastUser] = index + 1;
        }

        // Remove last element
        waitlist.pop();
        delete waitlistIndex[user];

        emit RemovedFromWaitlist(user);
    }

    // Prioritize user by moving them to front of waitlist
    function prioritize(address user) external onlyAdmin {
        require(user != address(0), "Invalid address");
        require(!_isInWaitlist(user), "Already in waitlist");

        // Insert user at front:
        waitlist.push(user); // add at end first
        uint256 len = waitlist.length;

        // Shift all elements right by one
        for (uint256 i = len - 1; i > 0; i--) {
            waitlist[i] = waitlist[i - 1];
            waitlistIndex[waitlist[i]] = i + 1;
        }

        waitlist[0] = user;
        waitlistIndex[user] = 1;

        emit Prioritized(user);
    }

    function getWaitlist() external view returns (address[] memory) {
        return waitlist;
    }

    function _isInWaitlist(address user) internal view returns (bool) {
        return waitlistIndex[user] != 0;
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid address");
        emit AdminTransferred(admin, newAdmin);
        admin = newAdmin;
    }
}