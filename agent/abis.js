const addInterestAbi = [
    {
          "inputs": [
              {
                  "internalType": "uint256",
                  "name": "tokenId",
                  "type": "uint256"
              },
              {
                  "internalType": "string",
                  "name": "interest",
                  "type": "string"
              }
          ],
          "name": "addVerifiedInterest",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
      },
  ];
  
  const updateFollowersABI = [
    {
          "inputs": [
              {
                  "internalType": "uint256",
                  "name": "tokenId",
                  "type": "uint256"
              },
              {
                  "internalType": "string",
                  "name": "platform",
                  "type": "string"
              },
              {
                  "internalType": "uint256",
                  "name": "followerCount",
                  "type": "uint256"
              }
          ],
          "name": "updateSocialFollowers",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
      }
  ];
  
  const getTokenIdFromAddressABI = [
    {
          "inputs": [
              {
                  "internalType": "address",
                  "name": "user",
                  "type": "address"
              }
          ],
          "name": "getTokenId",
          "outputs": [
              {
                  "internalType": "uint256",
                  "name": "tokenId",
                  "type": "uint256"
              }
          ],
          "stateMutability": "view",
          "type": "function"
      }
  ];
  
  const mintABI = [
    {
          "inputs": [
              {
                  "internalType": "address",
                  "name": "to",
                  "type": "address"
              }
          ],
          "name": "mintIdentityNFT",
          "outputs": [
              {
                  "internalType": "uint256",
                  "name": "",
                  "type": "uint256"
              }
          ],
          "stateMutability": "nonpayable",
          "type": "function"
      }
  ];
  
  const linkWalletABI = [
    {
          "inputs": [
              {
                  "internalType": "uint256",
                  "name": "tokenId",
                  "type": "uint256"
              },
              {
                  "internalType": "address",
                  "name": "wallet",
                  "type": "address"
              }
          ],
          "name": "linkWallet",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
      },
  ];
  
  const addCommunityABI = [
    {
          "inputs": [
              {
                  "internalType": "address",
                  "name": "platformAddress",
                  "type": "address"
              },
              {
                  "internalType": "string",
                  "name": "name",
                  "type": "string"
              },
              {
                  "internalType": "string",
                  "name": "guidelines",
                  "type": "string"
              },
              {
                  "internalType": "uint256",
                  "name": "owner",
                  "type": "uint256"
              }
          ],
          "name": "registerPlatform",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
      }
  ];
  
  const upvotePostABI = [
      {
          "inputs": [
              {
                  "internalType": "uint256",
                  "name": "tokenId",
                  "type": "uint256"
              },
              {
                  "internalType": "address",
                  "name": "platform",
                  "type": "address"
              },
              {
                  "internalType": "string",
                  "name": "ipfsHash",
                  "type": "string"
              }
          ],
          "name": "upvotePost",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
      }
  ];
  
  export { addInterestAbi, updateFollowersABI, getTokenIdFromAddressABI, mintABI, linkWalletABI, addCommunityABI, upvotePostABI };