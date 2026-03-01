// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

contract PriorityParking {
    
    struct Slot {
        bool occupied;
        address user;
        string carNumber;
    }

    struct WaitlistEntry {
        address user;
        bool isPriority;
        string carNumber;
    }

    uint256 public totalSlots;
    uint256 public allocatedSlots;
    
    Slot[] public slots;
    WaitlistEntry[] public waitlist;

    mapping(address => bool) public hasBooked;

    event SlotBooked(uint256 indexed slotId, address indexed user, string carNumber, bool priority);
    event AddedToWaitlist(address indexed user, bool priority, string carNumber);
    event SlotReleased(uint256 indexed slotId, address indexed user);
    event PromotedFromWaitlist(address indexed user, uint256 indexed slotId);

    constructor(uint256 _totalSlots) {
        require(_totalSlots > 0, "Total slots must be > 0");
        totalSlots = _totalSlots;

        for (uint256 i = 0; i < totalSlots; i++) {
            slots.push(Slot(false, address(0), ""));
        }
    }

    function bookSlot(string memory carNumber, bool priority) external {
        require(!hasBooked[msg.sender], "Already booked or waitlisted");

        // Try allocating free slot
        for (uint256 i = 0; i < totalSlots; i++) {
            if (!slots[i].occupied) {
                slots[i].occupied = true;
                slots[i].user = msg.sender;
                slots[i].carNumber = carNumber;
                allocatedSlots++;
                hasBooked[msg.sender] = true;

                emit SlotBooked(i, msg.sender, carNumber, priority);
                return;
            }
        }

        // If no slots → add priority user to front, normal to back
        if (priority) {
            waitlist.push(WaitlistEntry(address(0), false, "")); 
            for (uint256 i = waitlist.length - 1; i > 0; i--) {
                waitlist[i] = waitlist[i - 1];
            }
            waitlist[0] = WaitlistEntry(msg.sender, priority, carNumber);
        } else {
            waitlist.push(WaitlistEntry(msg.sender, priority, carNumber));
        }

        hasBooked[msg.sender] = true;
        emit AddedToWaitlist(msg.sender, priority, carNumber);
    }

    function releaseSlot(uint256 slotId) external {
        require(slotId < totalSlots, "Invalid slot ID");
        require(slots[slotId].occupied, "Slot not booked");
        require(slots[slotId].user == msg.sender, "Not your slot");

        slots[slotId].occupied = false;
        slots[slotId].user = address(0);
        slots[slotId].carNumber = "";
        allocatedSlots--;
        hasBooked[msg.sender] = false;

        emit SlotReleased(slotId, msg.sender);

        // Auto-promote next: priority users first
        if (waitlist.length > 0) {
            uint256 idx = 0;
            WaitlistEntry memory nextUser = waitlist[idx];

            slots[slotId].occupied = true;
            slots[slotId].user = nextUser.user;
            slots[slotId].carNumber = nextUser.carNumber;
            allocatedSlots++;
            hasBooked[nextUser.user] = true;

            removeWaitlistEntry(idx);

            emit PromotedFromWaitlist(nextUser.user, slotId);
        }
    }

    function removeWaitlistEntry(uint256 index) internal {
        for (uint256 i = index; i < waitlist.length - 1; i++) {
            waitlist[i] = waitlist[i + 1];
        }
        waitlist.pop();
    }

    function getWaitlist() external view returns (WaitlistEntry[] memory) {
        return waitlist;
    }
}