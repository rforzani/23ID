// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./node_modules/@openzeppelin/contracts/access/AccessControl.sol";

contract PlatformRegistry is AccessControl {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    struct PlatformInfo {
        string name;       // e.g., "Decentralized Forum"
        string guidelines; // IPFS hash or URI referencing the platform guidelines
        bool isRegistered;
        uint256 owner;     // The owner that registered the platform
    }

    // Mapping of platform address => PlatformInfo
    mapping(address => PlatformInfo) public registeredPlatforms;

    mapping (address => mapping (address => bool)) public platformRequests;

    mapping (address => mapping (address => bool)) public platformAdmissions;
    
    mapping (address => address[]) public platformRequestsList;

    mapping (address => address[]) public platformAdmissionsList;

    event PlatformRegistered(
        address indexed platformAddress,
        string name,
        string guidelines
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRAR_ROLE, msg.sender);
    }

    function changeAdmin(address newAdmin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newAdmin != address(0), "Invalid admin address");
        _revokeRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _revokeRole(REGISTRAR_ROLE, msg.sender);
        _grantRole(DEFAULT_ADMIN_ROLE, newAdmin);
        _grantRole(REGISTRAR_ROLE, newAdmin);
    }

    /**
     * @dev Register a new social platform.
     * @param platformAddress The contract address or representative address of the platform.
     * @param name A descriptive name for the platform.
     * @param guidelines IPFS hash or URI referencing the platform's content guidelines.
     */
    function registerPlatform(
        address platformAddress,
        string calldata name,
        string calldata guidelines,
        uint256 owner
    ) external onlyRole(REGISTRAR_ROLE) {
        require(!registeredPlatforms[platformAddress].isRegistered, "Already registered");
        registeredPlatforms[platformAddress] = PlatformInfo({
            name: name,
            guidelines: guidelines,
            isRegistered: true,
            owner: owner
        });

        emit PlatformRegistered(platformAddress, name, guidelines);
    }

    function requestPlatformAdmission(address platformAddress, address requestingAddress) external {
        require(registeredPlatforms[platformAddress].isRegistered, "Not registered");
        require(!platformRequests[platformAddress][requestingAddress], "Already requested");
        require(!platformAdmissions[platformAddress][requestingAddress], "Already admitted");
        platformRequests[platformAddress][requestingAddress] = true;
        platformRequestsList[platformAddress].push(requestingAddress);
    }

    function admitPlatformRequest(address platformAddress, address requestingAddress) external onlyRole(REGISTRAR_ROLE) {
        require(registeredPlatforms[platformAddress].isRegistered, "Not registered");
        require(platformRequests[platformAddress][requestingAddress], "Not requested");
        require(!platformAdmissions[platformAddress][requestingAddress], "Already admitted");
        platformAdmissions[platformAddress][requestingAddress] = true;
        platformAdmissionsList[platformAddress].push(requestingAddress);
    }

    function rejectPlatformRequest(address platformAddress, address requestingAddress) external onlyRole(REGISTRAR_ROLE) {
        require(registeredPlatforms[platformAddress].isRegistered, "Not registered");
        require(platformRequests[platformAddress][requestingAddress], "Not requested");
        require(!platformAdmissions[platformAddress][requestingAddress], "Already admitted");
        platformRequests[platformAddress][requestingAddress] = false;
        // Remove from requests list
        for (uint i = 0; i < platformRequestsList[platformAddress].length; i++) {
            if (platformRequestsList[platformAddress][i] == requestingAddress) {
                platformRequestsList[platformAddress][i] = platformRequestsList[platformAddress][platformRequestsList[platformAddress].length - 1];
                platformRequestsList[platformAddress].pop();
                break;
            }
        }
    }

    function getPlatformRequests(address platformAddress) external view returns (address[] memory) {
        return platformRequestsList[platformAddress];
    }   

    /**
     * @dev Get platform guidelines by address.
     */
    function getGuidelines(address platformAddress) external view returns (string memory) {
        require(registeredPlatforms[platformAddress].isRegistered, "Not registered");
        return registeredPlatforms[platformAddress].guidelines;
    }

    /**
     * @dev Check if a platform is registered.
     */
    function isPlatformRegistered(address platformAddress) external view returns (bool) {
        return registeredPlatforms[platformAddress].isRegistered;
    }
}
