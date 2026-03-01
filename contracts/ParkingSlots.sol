// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

contract ParkingSlots {
    struct Slot {
        bool isAvailable;
        address bookedBy;
        string carNumber; 
    }

    uint256 public totalSlots;
    mapping(uint256 => Slot) private slots;

    event SlotBooked(uint256 indexed slotId, address indexed user, string carNumber); 
    event SlotReleased(uint256 indexed slotId, address indexed user);

    constructor(uint256 _totalSlots) {
        require(_totalSlots > 0, "Total slots must be > 0");
        totalSlots = _totalSlots;

        // Initialize all slots as available
        for (uint256 i = 0; i < totalSlots; i++) {
            slots[i] = Slot({isAvailable: true, bookedBy: address(0), carNumber: ""});
        }
    }

    function bookSlot(uint256 slotId, string memory carNumber) external {
        require(slotId < totalSlots, "Invalid slot ID");
        Slot storage slot = slots[slotId];
        require(slot.isAvailable, "Slot is already booked");

        slot.isAvailable = false;
        slot.bookedBy = msg.sender;
        slot.carNumber = carNumber;

        emit SlotBooked(slotId, msg.sender, carNumber);
    }

    function releaseSlot(uint256 slotId) external {
        require(slotId < totalSlots, "Invalid slot ID");
        Slot storage slot = slots[slotId];
        require(!slot.isAvailable, "Slot is not booked");
        require(slot.bookedBy == msg.sender, "Only the booker can release");

        slot.isAvailable = true;
        slot.bookedBy = address(0);
        slot.carNumber = "";

        emit SlotReleased(slotId, msg.sender);
    }

    function getSlotStatus(uint256 slotId)
        external
        view
        returns (bool isAvailable, address bookedBy, string memory carNumber)
    {
        require(slotId < totalSlots, "Invalid slot ID");
        Slot storage slot = slots[slotId];
        return (slot.isAvailable, slot.bookedBy, slot.carNumber);
    }
}