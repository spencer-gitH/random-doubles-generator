import DiceIcon from "./DiceIcon";

export default function Wordmark({ diceSize = 36 }: { diceSize?: number }) {
  return (
    <div className="wordmark">
      <DiceIcon size={diceSize} state="idle" />
      <div className="wordmark__lockup">
        <div className="wordmark__title">Random Doubles</div>
        <div className="wordmark__sub">Draw · Roll · Play</div>
      </div>
    </div>
  );
}
