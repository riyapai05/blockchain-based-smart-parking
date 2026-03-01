// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

contract SlotAllocationAdmin {
    address public immutable admin;

    struct MedicalRecord {
        string documentHash;  // IPFS hash or URL
        bool submitted;
        bool verified;
    }

    struct Slot {
        address user;
        bool occupied;
    }

    uint256 public totalSlots;
    uint256 public allocatedSlots;

    mapping(address => MedicalRecord) public medicalRecords;
    mapping(address => uint256) public userSlot;
    Slot[] public slots;

    // Events
    event DocumentSubmitted(address indexed user, string documentHash);
    event DocumentVerified(address indexed user, bool verified);
    event SlotAllocated(address indexed user, uint256 slotIndex);
    event SlotReleased(address indexed user, uint256 slotIndex);
    event SlotsIncreased(uint256 newTotal); // ✅ New event to track slot increase

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor(uint256 _totalSlots) {
        admin = msg.sender;
        totalSlots = _totalSlots;

        // Initialize slots array (index 0 unused for simplicity)
        slots.push(); // dummy slot at index 0
        for (uint256 i = 1; i <= totalSlots; i++) {
            slots.push(Slot(address(0), false));
        }
    }

    // User submits a medical document hash
    function submitMedicalDocument(string calldata docHash) external {
        require(!medicalRecords[msg.sender].submitted, "Already submitted");

        medicalRecords[msg.sender] = MedicalRecord({
            documentHash: docHash,
            submitted: true,
            verified: false
        });

        emit DocumentSubmitted(msg.sender, docHash);
    }

    // Admin verifies user's medical record
    function verifyMedicalRecord(address user, bool verified) external onlyAdmin {
        require(medicalRecords[user].submitted, "No document submitted");

        medicalRecords[user].verified = verified;

        emit DocumentVerified(user, verified);
    }

    // Admin allocates a slot to a verified user
    function allocateSlot(address user) external onlyAdmin {
        require(medicalRecords[user].verified, "User not verified");
        require(userSlot[user] == 0, "User already has slot");
        require(allocatedSlots < totalSlots, "No slots available");

        // Avoid costly ops inside loop: Find index first
        uint256 foundIndex = 0;
        for (uint256 i = 1; i <= totalSlots; i++) {
            if (!slots[i].occupied) {
                foundIndex = i;
                break;
            }
        }

        require(foundIndex != 0, "No free slots found");

        slots[foundIndex] = Slot(user, true);
        userSlot[user] = foundIndex;
        allocatedSlots++;

        emit SlotAllocated(user, foundIndex);
    }

    // User releases their assigned slot
    function releaseSlot() external {
        uint256 slotIdx = userSlot[msg.sender];
        require(slotIdx != 0, "No slot assigned");

        slots[slotIdx] = Slot(address(0), false);
        userSlot[msg.sender] = 0;
        allocatedSlots--;

        emit SlotReleased(msg.sender, slotIdx);
    }

    // Admin increases total slots
    function increaseSlots(uint256 newTotal) external onlyAdmin {
        require(newTotal > totalSlots, "New total must be greater");

        for (uint256 i = totalSlots + 1; i <= newTotal; i++) {
            slots.push(Slot(address(0), false));
        }

        totalSlots = newTotal;
        emit SlotsIncreased(newTotal); // ✅ Emit after update
    }

    // View slot info
    function getSlot(uint256 index) external view returns (address user, bool occupied) {
        require(index > 0 && index <= totalSlots, "Invalid slot index");
        Slot memory s = slots[index];
        return (s.user, s.occupied);
    }
}