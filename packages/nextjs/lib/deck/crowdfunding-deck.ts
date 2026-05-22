// The Crowdfunding deck — the curriculum the learner walks through.
//
// Written to mirror the challenge README's checkpoints: explain a thing, then
// ask the learner to write one specific line, then test understanding. Small
// steps, no leaps, no assumed knowledge — this is an early challenge, so we don't
// assume they've seen mappings, events, or payable before.
//
// Voice: a senior dev walking a junior through what they're building. Lead with
// the situation, not the definition. No hype, no em dashes, no bold-label
// paragraphs. The concept prose is rewritten from the challenge's CONCEPTS.yaml,
// not lifted, because the source read a little flat.
import { CANONICAL, CROWDFUNDING_SKELETON } from "./crowdfunding-contracts";
import type { Card, Deck } from "./types";

const cards: Card[] = [
  {
    id: "trustless",
    type: "concept",
    tier1: "THE IDEA",
    tier2: "sutra",
    title: "Funding without a middleman",
    body: `Say a group of people want to pool money toward something. Normally someone has to sit in the middle holding the cash, an escrow service or a platform everyone agrees to trust. On Ethereum you can drop that middleman. You write the rules into a contract, deploy it, and the contract itself holds the money and enforces the rules.

Here's the thing you're building. People send ETH toward a goal. If enough comes in before a deadline, the money goes to whoever the campaign is funding. If not enough comes in, everyone can pull their money back out. Once it's deployed nobody can change those rules, not the contributors and not you. The worst case is everyone gets refunded.

That pattern is everywhere on Ethereum. People who have no reason to trust each other can still work together, because they're all trusting the same code instead of trusting a person. Crowdfunds, token launches, grants rounds, they're all the same idea wearing different clothes.`,
  },
  {
    id: "who-enforces",
    type: "think",
    tier1: "THINK",
    tier2: "prashna",
    title: "Who keeps everyone honest",
    question:
      "Nobody contributing has to trust you or each other. So what actually stops the rules from changing halfway through, once people's money is already in?",
    rubricConcepts: [
      "smart contract",
      "code",
      "rules",
      "enforced",
      "deployed",
      "can't change",
      "on-chain",
      "trustless",
    ],
    hint: "Think about what can and can't happen to a contract after it's deployed, and who has the power to touch it.",
  },
  {
    id: "shape",
    type: "code",
    tier1: "THE CODE",
    tier2: "darshan",
    title: "The shape of it",
    file: "CrowdFund.sol",
    fromAnchor: "constructor(address fundingRecipientAddress)",
    toAnchor: "fundingRecipient = FundingRecipient(fundingRecipientAddress);",
    note: `Here's the contract you'll fill in, a piece at a time. It's grouped into sections: errors and state variables near the top, then the constructor, then the functions, which are empty shells right now. The one thing already wired is \`fundingRecipient\` — the contract that receives the money if the campaign succeeds. Everything else, you'll write.`,
  },
  {
    id: "tracking",
    type: "concept",
    tier1: "THE IDEA",
    tier2: "sutra",
    title: "Tracking who gave what",
    body: `The contract can't just remember the total that came in. It needs to know how much each person put in, individually. The reason is the refund case: if the campaign fails, everyone has to get back exactly what they contributed, no more and no less. You can't do that from a single total.

The tool for this in Solidity is a **mapping**. Think of it as a dictionary that links each contributor's address to the amount they've sent. Every address starts at zero by default, so you don't have to set anyone up ahead of time. And when someone contributes more than once, you want their amounts to add up, not overwrite, otherwise their earlier money would vanish from the records.`,
  },
  {
    id: "balances",
    type: "your-turn",
    tier1: "YOUR TURN",
    tier2: "lekhana",
    title: "Track the balances",
    file: "CrowdFund.sol",
    slot: "__BALANCES__",
    prompt: `Add a state variable: a mapping from each contributor's \`address\` to the \`uint256\` amount they've put in. Make it \`public\` so the frontend can read it, and call it \`balances\`.`,
    placeholder: "mapping(address => uint256) public /* name it */;",
    canonical: CANONICAL.__BALANCES__,
  },
  {
    id: "events-idea",
    type: "concept",
    tier1: "THE IDEA",
    tier2: "sutra",
    title: "Telling the outside world",
    body: `Your contract lives on-chain. The frontend that people actually click on lives off-chain, in a browser. Those two worlds don't share memory, so the contract needs a way to tell the outside world when something happened.

That's what **events** are for. An event is a little log entry the contract emits during a transaction, and anything off-chain can listen for it. When someone contributes, you emit an event, and the frontend hears it and updates the screen. Without events, the frontend would have to keep asking the contract "anything new? anything new?" over and over, which is slow and wasteful.`,
  },
  {
    id: "event",
    type: "your-turn",
    tier1: "YOUR TURN",
    tier2: "lekhana",
    title: "Announce a contribution",
    file: "CrowdFund.sol",
    slot: "__EVENT__",
    prompt: `Declare an event called \`Contribution\` that carries the two things a listener would care about: the \`address\` of the contributor and the \`uint256\` amount they sent.`,
    placeholder: "event Contribution(/* who, and how much? */);",
    canonical: CANONICAL.__EVENT__,
  },
  {
    id: "payable-idea",
    type: "concept",
    tier1: "THE IDEA",
    tier2: "sutra",
    title: "Taking the money in",
    body: `For a function to actually receive ETH, you have to mark it \`payable\`. Without that keyword, the contract rejects any ETH sent to it. The \`contribute()\` function is already marked payable, so it's ready to accept money.

Inside any function you also get two things straight from the transaction itself. \`msg.sender\` is the address that called the function, and \`msg.value\` is how much ETH they attached. Neither can be faked, they come from the signed transaction. So recording a contribution is really just: take \`msg.value\`, add it to \`msg.sender\`'s entry in the mapping, and announce it.`,
  },
  {
    id: "contribute",
    type: "your-turn",
    tier1: "YOUR TURN",
    tier2: "lekhana",
    title: "Write contribute()",
    file: "CrowdFund.sol",
    slot: "__CONTRIBUTE__",
    prompt: `Two lines. Add the sender's \`msg.value\` to their balance in the mapping (remember: add, don't overwrite). Then emit the \`Contribution\` event with the sender and the amount.`,
    placeholder: "balances[msg.sender] += msg.value;\n// then announce it with the event",
    canonical: CANONICAL.__CONTRIBUTE__,
  },
  {
    id: "try-contribute",
    type: "try-it",
    tier1: "TRY IT",
    tier2: "prayoga",
    title: "Put some ETH in",
    scenario: "contribute",
    body: `Your contract is live. Send it some ETH and watch your tracked balance and the contract's balance both climb, running against the \`contribute()\` you just wrote. (Anything you haven't written yet, we fill in for you so the contract runs.)`,
  },
  {
    id: "sending-eth",
    type: "concept",
    tier1: "THE IDEA",
    tier2: "sutra",
    title: "Sending ETH is where it gets scary",
    body: `When the campaign fails, people need their money back. Sounds easy: just send each person their ETH. But sending ETH is one of the most dangerous things you can do in Solidity, and getting the order of operations wrong can drain the whole contract.

The danger is called a **reentrancy attack**. When you send ETH to an address, if that address is itself a contract, it gets to run code the moment it receives the money. That code can call straight back into your withdraw function before you've updated anyone's balance. So it withdraws, re-enters, withdraws again, re-enters again, draining everything before the first call ever finishes. This is exactly how the famous DAO hack played out in 2016.

The fix is an ordering rule, sometimes called Checks, Effects, Interactions. First check that the withdrawal is allowed. Then update your own state, set the person's balance to zero. Only then send the ETH. If a malicious contract tries to re-enter, the balance is already zero, so there's nothing left to take. The whole trick is doing the state change before the external call, never after.`,
  },
  {
    id: "zero-first",
    type: "think",
    tier1: "THINK",
    tier2: "prashna",
    title: "Why empty the balance first",
    question:
      "Why does it matter so much that you set someone's balance to zero before you send them their ETH, instead of after? What goes wrong if you flip those two lines?",
    rubricConcepts: ["reentrancy", "re-enter", "call again", "drain", "attack", "before", "state", "zero"],
    hint: "Picture the person you're paying being a contract that runs code the instant it gets ETH, and that code calls withdraw again.",
  },
  {
    id: "open-to-withdraw",
    type: "your-turn",
    tier1: "YOUR TURN",
    tier2: "lekhana",
    title: "Open the door to refunds",
    file: "CrowdFund.sol",
    slot: "__OPEN_TO_WITHDRAW__",
    prompt: `Refunds shouldn't be allowed while the campaign is still running, only once it's failed. Add a \`public\` boolean called \`openToWithdraw\` to track that. It defaults to \`false\`, which is what you want.`,
    placeholder: "bool public /* name the flag */;",
    canonical: CANONICAL.__OPEN_TO_WITHDRAW__,
  },
  {
    id: "withdraw",
    type: "your-turn",
    tier1: "YOUR TURN",
    tier2: "lekhana",
    title: "Write withdraw()",
    file: "CrowdFund.sol",
    slot: "__WITHDRAW__",
    prompt: `Follow the ordering rule. First, if \`openToWithdraw\` is false, revert with \`NotOpenToWithdraw\`. Then read the caller's balance into a local variable and set their stored balance to zero. Only then send them the ETH with \`msg.sender.call{value: ...}("")\`, and revert with \`WithdrawTransferFailed\` if it didn't succeed. (The errors are already declared up top.)`,
    placeholder:
      "if (!openToWithdraw) revert NotOpenToWithdraw();\n\nuint256 balance = balances[msg.sender];\n// zero it out, then send, then check success",
    canonical: CANONICAL.__WITHDRAW__,
  },
  {
    id: "state-machine",
    type: "concept",
    tier1: "THE IDEA",
    tier2: "sutra",
    title: "A contract is a state machine",
    body: `It helps to think of your contract as moving through a few distinct states. First there's the funding period, where contributions are open and the clock is ticking. Then it lands in one of two end states: success, where enough ETH came in and it gets forwarded to the recipient, or failure, where it didn't and everyone can withdraw.

There's a catch that trips up everyone new to smart contracts: a contract can't do anything on its own. There's no timer, no scheduler, nothing that fires when the deadline passes. The contract just sits there. Even after the deadline, it stays in the funding state until somebody sends a transaction that tells it to check the clock and move on. So you need an \`execute()\` function that anyone can call once the deadline is up, to push the contract into success or failure.`,
  },
  {
    id: "deadline-threshold",
    type: "your-turn",
    tier1: "YOUR TURN",
    tier2: "lekhana",
    title: "Set the deadline and the goal",
    file: "CrowdFund.sol",
    slot: "__DEADLINE_THRESHOLD__",
    prompt: `Add two state variables. A \`deadline\`, set to the current time (\`block.timestamp\`) plus 30 seconds. And a \`threshold\` constant set to \`1 ether\`, the amount you need to raise for the campaign to count as a success.`,
    placeholder:
      "uint256 public deadline = block.timestamp + /* how long? */;\nuint256 public constant threshold = /* the goal */;",
    canonical: CANONICAL.__DEADLINE_THRESHOLD__,
  },
  {
    id: "execute",
    type: "your-turn",
    tier1: "YOUR TURN",
    tier2: "lekhana",
    title: "Write execute()",
    file: "CrowdFund.sol",
    slot: "__EXECUTE__",
    prompt: `First, if the deadline hasn't passed yet (\`block.timestamp <= deadline\`), revert with \`TooEarly\`. Then check the result: if the contract's balance reached the \`threshold\`, forward all of it to the recipient with \`fundingRecipient.complete{value: address(this).balance}()\`. Otherwise, set \`openToWithdraw\` to true so contributors can get refunds.`,
    placeholder:
      "if (block.timestamp <= deadline) revert TooEarly(deadline, block.timestamp);\n\n// if the threshold was met, forward the funds; otherwise open withdrawals",
    canonical: CANONICAL.__EXECUTE__,
  },
  {
    id: "timeleft",
    type: "your-turn",
    tier1: "YOUR TURN",
    tier2: "lekhana",
    title: "Show the time left",
    file: "CrowdFund.sol",
    slot: "__TIMELEFT__",
    prompt: `The frontend wants to show a countdown, so finish \`timeLeft()\`. If the \`deadline\` is still in the future, return how many seconds are left. Otherwise return 0. A ternary does it in one line.`,
    placeholder: "return deadline > block.timestamp ? /* seconds remaining */ : 0;",
    canonical: CANONICAL.__TIMELEFT__,
  },
  {
    id: "must-poke",
    type: "think",
    tier1: "THINK",
    tier2: "prashna",
    title: "Why someone has to poke it",
    question:
      "The deadline passes and the campaign didn't reach its goal. Why can't contributors just withdraw right then? Why does someone have to call execute() first?",
    rubricConcepts: [
      "state transition",
      "trigger",
      "someone",
      "can't auto-execute",
      "no automatic",
      "transaction",
      "enable",
    ],
    hint: "Remember that a contract can't run code on its own. Nothing happens until a transaction makes it happen.",
  },
  {
    id: "try-fail",
    type: "try-it",
    tier1: "TRY IT",
    tier2: "prayoga",
    title: "Let the campaign fail",
    scenario: "failure-refund",
    body: `Contribute less than the 1 ETH threshold, then let the deadline pass and call \`execute()\`. Since the goal wasn't met, it opens withdrawals, and you can pull your money back. Try calling execute() before the deadline and you'll see it refuse.`,
  },
  {
    id: "try-succeed",
    type: "try-it",
    tier1: "TRY IT",
    tier2: "prayoga",
    title: "Let it succeed",
    scenario: "success-forward",
    body: `Now the other ending. Contribute more than the threshold, let the deadline pass, and call \`execute()\`. This time the money forwards to the recipient and its \`completed\` flag flips to true. Same function, two outcomes, decided entirely by how much came in.`,
  },
  {
    id: "receive-idea",
    type: "concept",
    tier1: "THE IDEA",
    tier2: "sutra",
    title: "Catching loose ETH",
    body: `Right now someone can only contribute by calling \`contribute()\` directly. But people (and wallets) sometimes just send ETH straight to a contract address with no function specified. By default that money would be rejected.

Solidity has a special function for this called \`receive()\`. It runs automatically whenever the contract gets ETH with no function named. You can use it to catch that ETH and route it into your normal contribution logic, so a plain transfer counts as a contribution too. Better experience, and no money left stranded.`,
  },
  {
    id: "receive",
    type: "your-turn",
    tier1: "YOUR TURN",
    tier2: "lekhana",
    title: "Write receive()",
    file: "CrowdFund.sol",
    slot: "__RECEIVE__",
    prompt: `One line. When ETH arrives with no function specified, just call \`contribute()\` so it gets tracked like any other contribution.`,
    placeholder: "// route a plain transfer into a contribution",
    canonical: CANONICAL.__RECEIVE__,
  },
  {
    id: "edge-cases",
    type: "concept",
    tier1: "THE IDEA",
    tier2: "sutra",
    title: "Closing the trapdoors",
    body: `Once the happy path works, the real smart-contract thinking starts: what could go wrong? This is where it differs from normal programming. A bug in a web app you can patch tomorrow. A contract is deployed once and can't be changed, so a hole stays open forever.

Here's a concrete one. What if someone sends ETH after the campaign already succeeded and the money was forwarded? That ETH lands in a contract that's done. There's no path to move it out anymore, so it's stuck for good. The way you handle this is with a guard. A **modifier** is a reusable check you attach to a function, and it runs before the function body. You can write one that refuses to run if the recipient is already completed, and attach it to the functions that shouldn't fire after the campaign is over. The goal is to make the bad state impossible to reach, not just unlikely.`,
  },
  {
    id: "too-late",
    type: "think",
    tier1: "THINK",
    tier2: "prashna",
    title: "Money sent too late",
    question:
      "Someone sends ETH to the contract after the campaign already succeeded and the funds were forwarded. What happens to that ETH, and why is there no way to get it back out?",
    rubricConcepts: ["trapped", "stuck", "no way out", "already completed", "campaign over"],
    hint: "Walk through every function that moves ETH out of the contract, and ask whether any of them still works once the campaign is done.",
  },
  {
    id: "modifier",
    type: "your-turn",
    tier1: "YOUR TURN",
    tier2: "lekhana",
    title: "Guard against double-funding",
    file: "CrowdFund.sol",
    slot: "__MODIFIER__",
    prompt: `Fill in the \`notCompleted\` modifier's guard. If the recipient is already completed (\`fundingRecipient.completed()\`), revert with \`AlreadyCompleted\`. It's already attached to contribute, withdraw, and execute, so once you write this one line, those functions are all protected.`,
    placeholder: "// revert if the recipient has already been completed",
    canonical: CANONICAL.__MODIFIER__,
  },
  {
    id: "ship-it",
    type: "ship-it",
    tier1: "SHIP IT",
    tier2: "prakashana",
    title: "Deploy it for real",
    body: `You wrote all of it: tracking contributions, refunding safely, the deadline, the two endings, and the guard. Deploy both contracts to the in-browser chain, the \`FundingRecipient\` first and then the \`CrowdFund\` wired to it, and watch the whole thing come up live.`,
  },
  {
    id: "what-you-built",
    type: "recap",
    tier1: "WHAT YOU BUILT",
    tier2: "samhita",
    title: "What you built",
    body: `This is the contract you co-authored, line by line. A group of strangers can now pool money toward a goal with nobody in the middle, get refunded safely if it falls short, and forward the funds automatically if it succeeds. The patterns underneath it, on-chain tracking, the order-of-operations rule for moving ETH, and modeling a contract as a state machine, are the same ones running under most of Ethereum.`,
  },
];

export const CROWDFUNDING_DECK: Deck = {
  id: "crowdfunding",
  title: "Crowdfunding",
  challenge: "speedrunethereum · crowdfunding",
  skeleton: CROWDFUNDING_SKELETON,
  cards,
};
