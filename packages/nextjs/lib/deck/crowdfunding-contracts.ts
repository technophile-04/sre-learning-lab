// The crowdfunding contract as the learner meets it. CrowdFund.sol carries
// `__SLOT__` tokens where YOUR TURN cards fill in code.
//
// This deck is an in-browser concepts workshop, so it's deliberately pared down
// from the full SRE challenge: no events (the frontend reads state directly here,
// nothing off-chain is listening) and no separate FundingRecipient contract — the
// recipient is just an address the funds forward to, and the success flag
// (`completed`) lives on CrowdFund itself.
//
// The pieces depend on each other (execute reads `deadline`, withdraw reads
// `openToWithdraw`), so a half-filled contract won't compile. That's why deploys
// use completedSources() — it fills any gaps with the reference code so the
// contract always runs, while keeping whatever the learner has written so far.
//
// The error declarations are given up front (the deck explains custom errors but
// doesn't make you type the boilerplate); the `notCompleted` modifier is already
// attached to the functions, so the edge-case card just writes its guard body.
import type { SolFile } from "./types";

export const CROWDFUND_SKELETON = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CrowdFund {
    /// Errors
    error NotOpenToWithdraw();
    error TransferFailed(address to, uint256 amount);
    error TooEarly(uint256 deadline, uint256 currentTimestamp);
    error AlreadyCompleted();

    /// State Variables
    address public fundingRecipient;
    bool public completed;
    /*__BALANCES__*/
    /*__OPEN_TO_WITHDRAW__*/
    /*__DEADLINE_THRESHOLD__*/

    /// Modifiers
    modifier notCompleted() {
        /*__MODIFIER__*/
        _;
    }

    /// Constructor
    constructor(address fundingRecipientAddress) {
        fundingRecipient = fundingRecipientAddress;
    }

    /// Functions
    function contribute() public payable notCompleted {
        /*__CONTRIBUTE__*/
    }

    function withdraw() public notCompleted {
        /*__WITHDRAW__*/
    }

    function execute() public notCompleted {
        /*__EXECUTE__*/
    }

    receive() external payable {
        /*__RECEIVE__*/
    }

    function timeLeft() public view returns (uint256) {
        /*__TIMELEFT__*/
    }
}
`;

export const CROWDFUNDING_SKELETON: Record<SolFile, string> = {
  "CrowdFund.sol": CROWDFUND_SKELETON,
};

/** Reference solutions keyed by slot token (from the challenge README). */
export const CANONICAL: Record<string, string> = {
  __BALANCES__: "mapping(address => uint256) public balances;",
  __OPEN_TO_WITHDRAW__: "bool public openToWithdraw;",
  __DEADLINE_THRESHOLD__: `uint256 public deadline = block.timestamp + 30 seconds;
uint256 public constant threshold = 1 ether;`,
  __MODIFIER__: "if (completed) revert AlreadyCompleted();",
  __CONTRIBUTE__: "balances[msg.sender] += msg.value;",
  __WITHDRAW__: `if (!openToWithdraw) revert NotOpenToWithdraw();

uint256 balance = balances[msg.sender];
balances[msg.sender] = 0;

(bool success, ) = msg.sender.call{value: balance}("");
if (!success) revert TransferFailed(msg.sender, balance);`,
  __EXECUTE__: `if (block.timestamp <= deadline) revert TooEarly(deadline, block.timestamp);

if (address(this).balance >= threshold) {
    completed = true;
    (bool success, ) = fundingRecipient.call{value: address(this).balance}("");
    if (!success) revert TransferFailed(fundingRecipient, address(this).balance);
} else {
    openToWithdraw = true;
}`,
  __RECEIVE__: "contribute();",
  __TIMELEFT__: "return deadline > block.timestamp ? deadline - block.timestamp : 0;",
};

/** Replace a `/*__SLOT__*\/` token with code, re-indenting to match the slot's
 *  leading whitespace so the rendered source stays clean. */
export function fillSlot(source: string, slot: string, code: string): string {
  const token = `/*${slot}*/`;
  const lines = source.split("\n");
  const idx = lines.findIndex(l => l.includes(token));
  if (idx === -1) return source;
  const indent = lines[idx].match(/^\s*/)?.[0] ?? "";
  lines[idx] = code
    .split("\n")
    .map(l => (l.length ? indent + l : l))
    .join("\n");
  return lines.join("\n");
}

/** True once every slot in the source has been filled (no tokens remain). */
export function isComplete(source: string): boolean {
  return !/\/\*__[A-Z_]+__\*\//.test(source);
}

/** Fill every remaining slot with its canonical code — used at deploy time so an
 *  in-progress contract still compiles and runs. Keeps the learner's filled-in
 *  lines; only the gaps get the reference code. */
export function completedSources(sources: Record<SolFile, string>): Record<SolFile, string> {
  let crowd = sources["CrowdFund.sol"];
  for (const [slot, code] of Object.entries(CANONICAL)) {
    crowd = fillSlot(crowd, slot, code);
  }
  return { "CrowdFund.sol": crowd };
}
