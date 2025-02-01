// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./node_modules/@openzeppelin/contracts/access/AccessControl.sol";

contract PlatformRegistry is AccessControl {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    struct PlatformInfo {
        string name;       // e.g., "Decentralized Forum"
        string guidelines; // IPFS hash or URI referencing the platform guidelines
        bool isRegistered;
    }

    // Mapping of platform address => PlatformInfo
    mapping(address => PlatformInfo) public registeredPlatforms;

    event PlatformRegistered(
        address indexed platformAddress,
        string name,
        string guidelines
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRAR_ROLE, msg.sender);
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
        string calldata guidelines
    ) external onlyRole(REGISTRAR_ROLE) {
        require(!registeredPlatforms[platformAddress].isRegistered, "Already registered");
        registeredPlatforms[platformAddress] = PlatformInfo({
            name: name,
            guidelines: guidelines,
            isRegistered: true
        });

        emit PlatformRegistered(platformAddress, name, guidelines);
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
