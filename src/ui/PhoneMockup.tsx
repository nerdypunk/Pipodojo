// What Pipo did in an app, drawn as a little phone screen: a chat for messages, a store cart for
// shopping. Built from the tool call's arguments. `flags` follow the tool's answer lines, so the
// part that shows a gap in the prompt is outlined in red. Nothing here is a real app.
import type { PipoAction } from "../engine/types.ts";
import { readable } from "../engine/actions.ts";

interface Props {
  action: PipoAction;
  /** One per answer line of the tool, true where that line shows a gap. */
  flags: readonly boolean[];
}

const FLAG = "ring-2 ring-red-400 ring-offset-1";

export function PhoneMockup({ action, flags }: Props) {
  return (
    <div className="pop-in mx-auto w-full max-w-sm overflow-hidden rounded-[26px] border-[5px] border-ink bg-white shadow-lg">
      {action.app === "whatsapp" ? <ChatScreen action={action} flags={flags} /> : <ShopScreen action={action} flags={flags} />}
    </div>
  );
}

function ChatScreen({ action, flags }: Props) {
  const to = readable(action.args.to);
  const message = typeof action.args.message === "string" ? action.args.message.trim() : readable(action.args.message);
  const sent = action.outcome === "done";
  return (
    <div aria-label={`Message to ${to}${sent ? ", sent" : ", draft waiting for your OK"}`}>
      {/* Chat header */}
      <div className={`flex items-center gap-2 bg-emerald-700 px-3 py-2 text-white ${flags[0] ? FLAG : ""}`}>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-base" aria-hidden="true">
          👥
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-black">{to}</p>
          <p className="text-[11px] font-semibold text-white/80">Group chat</p>
        </div>
      </div>
      {/* Conversation */}
      <div className="flex flex-col items-end gap-1 bg-[#efeae2] px-3 py-3">
        <p
          className={`max-w-[85%] rounded-2xl rounded-tr-sm px-3 py-2 text-sm leading-snug font-semibold whitespace-pre-line text-ink shadow-sm ${
            sent ? "bg-[#d9fdd3]" : "border-2 border-dashed border-gray-400 bg-white"
          } ${flags[1] ? FLAG : ""}`}
        >
          {message}
          <span className="mt-1 block text-right text-[10px] font-bold text-gray-500">
            {sent ? "4:02 PM ✓✓" : "Draft"}
          </span>
        </p>
      </div>
      {/* What happened */}
      <div
        className={`px-3 py-2 text-center text-sm font-black ${sent ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"} ${
          flags[2] ? FLAG : ""
        }`}
      >
        {sent ? "✅ Pipo sent it" : "⏳ Pipo is waiting for your OK to send"}
      </div>
    </div>
  );
}

function ShopScreen({ action, flags }: Props) {
  const items = Array.isArray(action.args.items) ? action.args.items : [];
  const paid = action.outcome === "done";
  const total = readable(action.args.total);
  return (
    <div aria-label={`Shopping cart, total $${total}${paid ? ", paid" : ", waiting for your OK to pay"}`}>
      <div className="flex items-center justify-between bg-brand-700 px-3 py-2 text-white">
        <p className="text-sm font-black">
          <span aria-hidden="true">🛒 </span>FreshCart
        </p>
        <p className="text-[11px] font-bold text-white/80">Your cart · {items.length} items</p>
      </div>
      <ul className={`max-h-32 overflow-y-auto px-3 py-1.5 ${flags[0] ? FLAG : ""}`}>
        {items.length === 0 && <li className="py-1 text-sm font-semibold text-gray-500">The cart is empty</li>}
        {items.map((item, i) => {
          const { name, price } = (item ?? {}) as { name?: unknown; price?: unknown };
          return (
            <li key={i} className="flex justify-between gap-2 border-b border-gray-100 py-1 text-[13px] font-semibold text-ink last:border-0">
              <span className="truncate">{readable(name ?? item)}</span>
              {price !== undefined && <span className="shrink-0 text-gray-600">${readable(price)}</span>}
            </li>
          );
        })}
      </ul>
      <div className="space-y-1 border-t border-gray-200 px-3 py-2">
        <p className={`flex justify-between rounded-md px-1 text-sm font-black text-ink ${flags[1] ? FLAG : ""}`}>
          <span>Total</span>
          <span>${total}</span>
        </p>
        <p className={`flex justify-between rounded-md px-1 text-[13px] font-semibold text-gray-700 ${flags[2] ? FLAG : ""}`}>
          <span>
            <span aria-hidden="true">🚚 </span>Delivery
          </span>
          <span>{readable(action.args.delivery)}</span>
        </p>
      </div>
      <div className={`px-3 pb-3 ${flags[3] ? FLAG : ""}`}>
        {paid ? (
          <p className="rounded-xl bg-emerald-50 py-2 text-center text-sm font-black text-emerald-800">✅ Pipo paid and placed the order</p>
        ) : (
          <div className="text-center">
            <p className="rounded-xl bg-brand-600 py-2 text-sm font-black text-white">Pay ${total}</p>
            <p className="mt-1 text-xs font-bold text-amber-800">⏳ Pipo is waiting for your OK to pay</p>
          </div>
        )}
      </div>
    </div>
  );
}
