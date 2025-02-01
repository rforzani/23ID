// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./node_modules/@openzeppelin/contracts/access/AccessControl.sol";
import "./node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./node_modules/@openzeppelin/contracts/utils/Strings.sol";

/**
 * @dev Interface for the PlatformRegistry contract.
 *      Allows checking if a platform is registered and retrieving its guidelines.
 */
interface IPlatformRegistry {
    function isPlatformRegistered(address platformAddress) external view returns (bool);
    function getGuidelines(address platformAddress) external view returns (string memory);
}

/**
 * @title DigitalIdentityNFT
 * @dev Extends ERC721 to store a person's on-chain identity/reputation data
 *      without revealing sensitive information.
 */
contract DigitalIdentityNFT is ERC721, AccessControl {
    using Strings for uint256;
    using Strings for address;

    // Define roles using keccak256 hash identifiers
    bytes32 public constant AI_AGENT_ROLE = keccak256("AI_AGENT_ROLE");

    // Token ID counter for minting new identity tokens
    uint256 private _tokenIdCounter;

    // Reference to the PlatformRegistry contract
    IPlatformRegistry public platformRegistry;

    /**
     * @dev Structure to hold references to user posts.
     */
    struct PostReference {
        address platform;  // Which platform this post belongs to
        string ipfsHash;   // IPFS reference to the post content
    }

    /**
     * @dev Structure to hold various identity/reputation metrics.
     *      Note: Mappings within structs can only be accessed via storage references.
     */
    struct IdentityData {
        // ----------------------
        //------- WEB 2 WORLD ---
        // ----------------------
        uint256 reputationScore;

        // Mapping of platform name to follower count (e.g., "twitter" => 1234)
        mapping(string => uint256) socialFollowers;

        // Array of verified interests or skills
        string[] verifiedInterests;

        // Array of job positions or roles (e.g., "Software Engineer at X")
        string[] jobPositions;

        // ----------------------
        //------- WEB 3 WORLD ---
        // ----------------------
        address[] linkedWallets;

        uint256 totalUpvotes;
        uint256 totalDownvotes;

        // Registered Web3 platforms for this user’s identity
        address[] registeredWeb3Platforms;

        // List of posts that this user has received upvotes on (optional tracking)
        PostReference[] upvotedPosts;

        // Mapping of platform address to PostReference for upvoted posts
        mapping(address => PostReference) upvotedBy;

        // List of posts that have been downvoted after moderation
        PostReference[] downvotedPosts;

        // List of posts awaiting moderation (i.e., reported content)
        PostReference[] pendingDownvotePosts;
    }

    // Mapping of tokenId => IdentityData
    mapping(uint256 => IdentityData) private _identityData;

    // Mapping from address to tokenId
    mapping(address => uint256) private _addressToTokenMap;

    // ------------------------------------------------------------------------
    // EVENTS
    // ------------------------------------------------------------------------
    event IdentityDataUpdated(
        uint256 indexed tokenId,
        string fieldName,
        string info
    );

    event PostUpvoted(
        uint256 indexed tokenId,
        address indexed upvoter,
        string ipfsHash
    );

    event PostPendingDownvote(
        uint256 indexed tokenId,
        address indexed reporter,
        string ipfsHash
    );

    event PostDownvoted(
        uint256 indexed tokenId,
        address indexed moderator,
        string ipfsHash
    );

    // ------------------------------------------------------------------------
    // CHANGING ADMIN
    // ------------------------------------------------------------------------

    /**
     * @dev Restricted to members with the AI_AGENT_ROLE.
     */

    function changeAdmin(address newAdmin) external onlyRole(AI_AGENT_ROLE) {
        require(newAdmin != address(0), "Invalid admin address");
        _revokeRole(AI_AGENT_ROLE, msg.sender);
        _grantRole(AI_AGENT_ROLE, newAdmin);
    }

    // ------------------------------------------------------------------------
    // CONSTRUCTOR
    // ------------------------------------------------------------------------
    /**
     * @dev Constructor sets up the NFT collection name and symbol.
     *      Additionally, it grants the deployer the default admin role.
     * @param _platformRegistryAddress The address of the deployed PlatformRegistry contract.
     */
    constructor(address _platformRegistryAddress) ERC721("DigitalIdentityNFT", "DINFT") {
        require(_platformRegistryAddress != address(0), "Invalid registry address");
        platformRegistry = IPlatformRegistry(_platformRegistryAddress);

        // Grant the contract deployer the default admin role
        _grantRole(AI_AGENT_ROLE, msg.sender);
    }

    // ------------------------------------------------------------------------
    // OVERRIDES
    // ------------------------------------------------------------------------
    /**
     * @dev Override the supportsInterface function to include AccessControl interfaces.
     * @param interfaceId The interface identifier, as specified in ERC-165.
     * @return bool Whether the contract implements the interface defined by `interfaceId`.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // ------------------------------------------------------------------------
    // MINTING
    // ------------------------------------------------------------------------
    /**
     * @dev Mint a new Digital Identity NFT to `to`.
     *      Only an address with AI_AGENT_ROLE can mint new tokens.
     * @param to The address which will own the newly minted NFT.
     *      Must not be the zero address.
     *      Must not already have an identity NFT.
     * @return tokenId The newly minted token's ID.
     */
    function mintIdentityNFT(address to)
        external
        onlyRole(AI_AGENT_ROLE)
        returns (uint256)
    {
        require(to != address(0), "Cannot mint to zero address");
        require(_addressToTokenMap[to] == 0, "Address already has an identity");
        unchecked {
            _tokenIdCounter += 1;
        }
        uint256 tokenId = _tokenIdCounter;
        _safeMint(to, tokenId);
        _addressToTokenMap[to] = tokenId;
        return tokenId;
    }

    // ------------------------------------------------------------------------
    // ERC721 OVERRIDES
    // ------------------------------------------------------------------------

    /**
     * @dev Safely transfers `tokenId` token from `from` to `to`, checking first that
     *      the sender is approved for the token. If `to` is a smart contract, it reverts.
     *      Overrides the default ERC721 behavior to prevent transfers to smart contracts.
     *      If `to` is not a part of the linked wallet addresses, the transfer is rejected.
     * @param from The current owner of the NFT.
     * @param to The new owner of the NFT.
     * @param tokenId The NFT to transfer.
     * @param data Additional data with no specified format.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public override {
        require(_identityData[tokenId].linkedWallets.length > 1, "No other linked wallets");
        bool isLinked = false;
        uint256 length = _identityData[tokenId].linkedWallets.length;
        for (uint256 i = 0; i < length; ) {
            if (_identityData[tokenId].linkedWallets[i] == to) {
                isLinked = true;
                break;
            }
            unchecked { ++i; }
        }
        require(isLinked, "Recipient not linked to identity");
        super.safeTransferFrom(from, to, tokenId, data);
    }

    // ------------------------------------------------------------------------
    // WEB2 UPDATES
    // ------------------------------------------------------------------------

    /**
     * @dev Update the reputation score (any logic: computed off-chain or on-chain).
     * @param tokenId The token ID of the user's identity NFT.
     * @param newScore The new reputation score to set.
     */
    function updateReputationScore(uint256 tokenId, uint256 newScore) external onlyRole(AI_AGENT_ROLE) {
        _requireMinted(tokenId);
        _identityData[tokenId].reputationScore = newScore;

        emit IdentityDataUpdated(
            tokenId,
            "reputationScore",
            newScore.toString()
        );
    }

    /**
     * @dev Update the social media followers for a specific platform (e.g., "twitter").
     * @param tokenId The token ID of the user's identity NFT.
     * @param platform The name of the social media platform.
     * @param followerCount The new follower count.
     */
    function updateSocialFollowers(
        uint256 tokenId,
        string calldata platform,
        uint256 followerCount
    ) external onlyRole(AI_AGENT_ROLE) {
        _requireMinted(tokenId);
        _identityData[tokenId].socialFollowers[platform] = followerCount;

        emit IdentityDataUpdated(tokenId, "socialFollowers", platform);
    }

    /**
     * @dev Add a verified interest/skill to the user's profile.
     * @param tokenId The token ID of the user's identity NFT.
     * @param interest The new interest or skill to add.
     */
    function addVerifiedInterest(uint256 tokenId, string calldata interest) external onlyRole(AI_AGENT_ROLE) {
        _requireMinted(tokenId);
        _identityData[tokenId].verifiedInterests.push(interest);

        emit IdentityDataUpdated(tokenId, "verifiedInterests", interest);
    }

    /**
     * @dev Add a job position or role to the user's identity.
     * @param tokenId The token ID of the user's identity NFT.
     * @param position The job position or role to add.
     */
    function addJobPosition(uint256 tokenId, string calldata position) external onlyRole(AI_AGENT_ROLE) {
        _requireMinted(tokenId);
        _identityData[tokenId].jobPositions.push(position);

        emit IdentityDataUpdated(tokenId, "jobPositions", position);
    }

    // ------------------------------------------------------------------------
    // WEB3 FUNCTIONS
    // ------------------------------------------------------------------------

    /**
     * @dev Link an external wallet address to the identity.
     * @param tokenId The token ID of the user's identity NFT.
     * @param wallet The external wallet address to link.
     */
    function linkWallet(uint256 tokenId, address wallet) external onlyRole(AI_AGENT_ROLE) {
        require(wallet != address(0), "Cannot link zero address");
        _identityData[tokenId].linkedWallets.push(wallet);
        _addressToTokenMap[wallet] = tokenId;

        emit IdentityDataUpdated(tokenId, "linkedWallets", wallet.toHexString());
    }

    /**
     * @dev Link a registered Web3 platform to the user's identity.
     *      Checks if the platform is registered in the PlatformRegistry.
     * @param tokenId The token ID of the user's identity NFT.
     * @param platformAddr The address of the Web3 platform to link.
     */
    function linkWeb3Platform(uint256 tokenId, address platformAddr) external {
        require(_addressToTokenMap[msg.sender] == tokenId, "Not allowed to link platform");
        require(platformRegistry.isPlatformRegistered(platformAddr), "Platform not registered");
        _identityData[tokenId].registeredWeb3Platforms.push(platformAddr);

        emit IdentityDataUpdated(tokenId, "registeredWeb3Platforms", platformAddr.toHexString());
    }

    /**
     * @dev Upvote a user's post (referenced by IPFS hash on a given platform).
     *      This increments their totalUpvotes counter and stores the reference.
     * @param tokenId The token ID of the user's identity NFT.
     * @param platform The address of the platform where the post exists.
     * @param ipfsHash The IPFS hash of the post content.
     */
    function upvotePost(uint256 tokenId, address platform, string calldata ipfsHash) external {
        _requireMinted(tokenId);
        require(platformRegistry.isPlatformRegistered(platform), "Platform not registered");

        IdentityData storage data = _identityData[tokenId];

        // Ensure the platform is linked to the user's identity
        bool isLinked = false;
        uint256 platformsLength = data.registeredWeb3Platforms.length;
        for (uint256 i = 0; i < platformsLength; ) {
            if (data.registeredWeb3Platforms[i] == platform) {
                isLinked = true;
                break;
            }
            unchecked { ++i; }
        }
        require(isLinked, "Platform not linked to identity");

        data.totalUpvotes += 1;

        // Store the post reference if it doesn't already exist
        bool exists = false;
        uint256 upvotedLength = data.upvotedPosts.length;
        for (uint256 i = 0; i < upvotedLength; ) {
            if (keccak256(bytes(data.upvotedPosts[i].ipfsHash)) == keccak256(bytes(ipfsHash))) {
                exists = true;
                break;
            }
            unchecked { ++i; }
        }
        if (!exists) {
            data.upvotedPosts.push(PostReference({platform: platform, ipfsHash: ipfsHash}));
        }

        emit PostUpvoted(tokenId, msg.sender, ipfsHash);
    }

    /**
     * @dev Request a downvote for a user's post (i.e., report it).
     *      The post is moved into a pending queue, to be reviewed by the AI agent.
     * @param tokenId The token ID of the user's identity NFT.
     * @param platform The address of the platform where the post exists.
     * @param ipfsHash The IPFS hash of the post content.
     */
    function requestDownvote(uint256 tokenId, address platform, string calldata ipfsHash) external {
        _requireMinted(tokenId);
        require(platformRegistry.isPlatformRegistered(platform), "Platform not registered");

        IdentityData storage data = _identityData[tokenId];

        // Ensure the platform is linked to the user's identity
        bool isLinked = false;
        uint256 platformsLength = data.registeredWeb3Platforms.length;
        for (uint256 i = 0; i < platformsLength; ) {
            if (data.registeredWeb3Platforms[i] == platform) {
                isLinked = true;
                break;
            }
            unchecked { ++i; }
        }
        require(isLinked, "Platform not linked to identity");

        // Add the post to the pendingDownvotePosts array if it doesn't already exist
        bool exists = false;
        uint256 pendingLength = data.pendingDownvotePosts.length;
        for (uint256 i = 0; i < pendingLength; ) {
            if (keccak256(bytes(data.pendingDownvotePosts[i].ipfsHash)) == keccak256(bytes(ipfsHash))) {
                exists = true;
                break;
            }
            unchecked { ++i; }
        }
        if (!exists) {
            data.pendingDownvotePosts.push(PostReference({platform: platform, ipfsHash: ipfsHash}));
        }

        emit PostPendingDownvote(tokenId, msg.sender, ipfsHash);
    }

    // ------------------------------------------------------------------------
    // AI AGENT FUNCTIONS
    // ------------------------------------------------------------------------

    /**
     * @dev The AI agent reviews the post. If it violates guidelines, a downvote is finalized.
     *      Removes the post from pendingDownvotePosts and increments totalDownvotes if violation is true.
     * @param tokenId The token ID of the user's identity NFT.
     * @param pendingIndex The index of the reported post in pendingDownvotePosts.
     * @param violation True if the post violates guidelines, false otherwise.
     */
    function finalizeDownvote(
        uint256 tokenId,
        uint256 pendingIndex,
        bool violation
    ) external onlyRole(AI_AGENT_ROLE) {
        _requireMinted(tokenId);

        IdentityData storage data = _identityData[tokenId];
        require(pendingIndex < data.pendingDownvotePosts.length, "Invalid index for pending post");

        // Grab the reported post reference
        PostReference memory postRef = data.pendingDownvotePosts[pendingIndex];

        // If there's a violation, increment downvotes and store it in downvotedPosts
        if (violation) {
            data.totalDownvotes += 1;
            data.downvotedPosts.push(postRef);

            emit PostDownvoted(tokenId, msg.sender, postRef.ipfsHash);
        }

        // Remove the post from the pending list using a "swap and pop" to keep array efficient
        uint256 lastIndex = data.pendingDownvotePosts.length - 1;
        if (pendingIndex < lastIndex) {
            data.pendingDownvotePosts[pendingIndex] = data.pendingDownvotePosts[lastIndex];
        }
        data.pendingDownvotePosts.pop();
    }

    // ------------------------------------------------------------------------
    // VIEW FUNCTIONS
    // ------------------------------------------------------------------------ù

    /**
     * @dev Returns the token ID of the user's identity NFT.
     * @param user The address of the user.
     * @return tokenId The token ID of the user's identity NFT.
     */
    function getTokenId(address user) external view returns (uint256 tokenId) {
        tokenId = _addressToTokenMap[user];
    }

    /**
     * @dev Returns the total number of upvotes and downvotes for the given tokenId.
     * @param tokenId The token ID of the user's identity NFT.
     * @return upvotes The total number of upvotes.
     * @return downvotes The total number of downvotes.
     */
    function getReputationCounters(uint256 tokenId)
        external
        view
        returns (uint256 upvotes, uint256 downvotes)
    {
        _requireMinted(tokenId);
        upvotes = _identityData[tokenId].totalUpvotes;
        downvotes = _identityData[tokenId].totalDownvotes;
    }

    /**
     * @dev Returns the posted references awaiting downvote moderation for a user.
     * @param tokenId The token ID of the user's identity NFT.
     * @return pendingPosts An array of PostReference structs awaiting moderation.
     */
    function getPendingDownvotePosts(uint256 tokenId)
        external
        view
        returns (PostReference[] memory pendingPosts)
    {
        _requireMinted(tokenId);
        pendingPosts = _identityData[tokenId].pendingDownvotePosts;
    }

    /**
     * @dev Returns the list of references that have been downvoted after moderation.
     * @param tokenId The token ID of the user's identity NFT.
     * @return downvotedPosts An array of PostReference structs that have been downvoted.
     */
    function getDownvotedPosts(uint256 tokenId)
        external
        view
        returns (PostReference[] memory downvotedPosts)
    {
        _requireMinted(tokenId);
        downvotedPosts = _identityData[tokenId].downvotedPosts;
    }

    /**
     * @dev Returns the user's linked Web3 platforms.
     * @param tokenId The token ID of the user's identity NFT.
     * @return platforms An array of platform addresses linked to the user's identity.
     */
    function getRegisteredWeb3Platforms(uint256 tokenId)
        external
        view
        returns (address[] memory platforms)
    {
        _requireMinted(tokenId);
        platforms = _identityData[tokenId].registeredWeb3Platforms;
    }

    /**
     * @dev Retrieves the social follower count for a specific platform.
     * @param tokenId The token ID of the user's identity NFT.
     * @param platform The name of the social media platform.
     * @return followerCount The number of followers the user has on the specified platform.
     */
    function getSocialFollowers(uint256 tokenId, string calldata platform)
        external
        view
        returns (uint256 followerCount)
    {
        _requireMinted(tokenId);
        followerCount = _identityData[tokenId].socialFollowers[platform];
    }

    /**
     * @dev Retrieves all verified interests/skills for a given tokenId.
     * @param tokenId The token ID of the user's identity NFT.
     * @return interests An array of verified interests or skills.
     */
    function getVerifiedInterests(uint256 tokenId)
        external
        view
        returns (string[] memory interests)
    {
        _requireMinted(tokenId);
        interests = _identityData[tokenId].verifiedInterests;
    }

    /**
     * @dev Retrieves all job positions for a given tokenId.
     * @param tokenId The token ID of the user's identity NFT.
     * @return positions An array of job positions or roles.
     */
    function getJobPositions(uint256 tokenId)
        external
        view
        returns (string[] memory positions)
    {
        _requireMinted(tokenId);
        positions = _identityData[tokenId].jobPositions;
    }

    /**
     * @dev Retrieves all linked wallet addresses for a given tokenId.
     * @param tokenId The token ID of the user's identity NFT.
     * @return wallets An array of linked wallet addresses.
     */
    function getLinkedWallets(uint256 tokenId)
        external
        view
        returns (address[] memory wallets)
    {
        _requireMinted(tokenId);
        wallets = _identityData[tokenId].linkedWallets;
    }

    /**
     * @dev Retrieves all upvoted posts for a given tokenId.
     * @param tokenId The token ID of the user's identity NFT.
     * @return upvotedPosts An array of PostReference structs representing upvoted posts.
     */
    function getUpvotedPosts(uint256 tokenId)
        external
        view
        returns (PostReference[] memory upvotedPosts)
    {
        _requireMinted(tokenId);
        upvotedPosts = _identityData[tokenId].upvotedPosts;
    }

    // ------------------------------------------------------------------------
    // INTERNAL / PRIVATE UTILS
    // ------------------------------------------------------------------------

    /**
     * @dev Internal function to revert if the token does not exist.
     * @param tokenId The token ID to check.
     */
    function _requireMinted(uint256 tokenId) internal view {
        require(_ownerOf(tokenId) != address(0), "Invalid tokenId");
    }
}
