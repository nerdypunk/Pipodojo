// The app screen inside Pipo's phone: a chat for messages, a store cart for shopping. Built from
// the tool call's arguments and sized to fill the phone. `flags` follow the tool's answer lines,
// so the part that shows a gap in the prompt is outlined in red. Nothing here is a real app.
import type { PipoAction } from "../engine/types.ts";
import { readable } from "../engine/actions.ts";

interface Props {
  action: PipoAction;
  /** One per answer line of the tool, true where that line shows a gap. */
  flags: readonly boolean[];
}

const FLAG = "ring-2 ring-red-400 ring-offset-1";

export function PhoneScreen({ action, flags }: Props) {
  return action.app === "whatsapp" ? <ChatScreen action={action} flags={flags} /> : <ShopScreen action={action} flags={flags} />;
}

/** A group chat. A draft waits in the typing box; once sent it's a bubble in the chat. */
function ChatScreen({ action, flags }: Props) {
  const to = readable(action.args.to);
  const message = typeof action.args.message === "string" ? action.args.message.trim() : readable(action.args.message);
  const sent = action.outcome === "done";
  return (
    <div className="flex h-full flex-col" aria-label={`Message to ${to}${sent ? ", sent" : ", draft waiting for your OK"}`}>
      <div className={`flex items-center gap-2 bg-emerald-700 px-3 py-2 text-white ${flags[0] ? FLAG : ""}`}>
        <span aria-hidden="true" className="text-lg leading-none">
          ‹
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-base" aria-hidden="true">
          👥
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-black">{to}</p>
          <p className="text-[11px] font-semibold text-white/80">tap here for group info</p>
        </div>
      </div>

      {/* Conversation */}
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-2 overflow-y-auto bg-[#efeae2] px-3 py-3">
        <span className="self-center rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-bold text-gray-600">Today</span>
        <p className="max-w-[80%] self-start rounded-2xl rounded-tl-sm bg-white px-3 py-1.5 text-[13px] leading-snug font-semibold text-ink shadow-sm">
          <span className="block text-[11px] font-black text-orange-600">Alex</span>
          Anyone free this weekend? ☀️
          <span className="block text-right text-[10px] font-bold text-gray-400">3:58 PM</span>
        </p>
        {sent && (
          <p
            className={`pop-in max-w-[88%] self-end rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-[13px] leading-snug font-semibold whitespace-pre-line text-ink shadow-sm ${
              flags[1] ? FLAG : ""
            }`}
          >
            {message}
            <span className="mt-1 block text-right text-[10px] font-bold text-gray-500">
              4:02 PM <span className="text-sky-500">✓✓</span>
            </span>
          </p>
        )}
      </div>

      {/* Typing box: Pipo's draft waits here until you send it */}
      <div className="flex items-end gap-2 bg-[#efeae2] px-2 pb-2">
        <p
          className={`max-h-28 flex-1 overflow-y-auto rounded-3xl bg-white px-3 py-2 text-[13px] leading-snug font-semibold whitespace-pre-line shadow-sm ${
            sent ? "text-gray-400" : "text-ink"
          } ${!sent && flags[1] ? FLAG : ""}`}
        >
          {sent ? "Message" : message}
        </p>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm text-white"
          aria-hidden="true"
        >
          ➤
        </span>
      </div>
    </div>
  );
}

/** A store cart: items, total, delivery. */
function ShopScreen({ action, flags }: Props) {
  const items = Array.isArray(action.args.items) ? action.args.items : [];
  const paid = action.outcome === "done";
  const total = readable(action.args.total);
  return (
    <div className="flex h-full flex-col" aria-label={`Shopping cart, total $${total}${paid ? ", paid" : ", waiting for your OK to pay"}`}>
      <div className="flex items-center justify-between bg-brand-700 px-3 py-2.5 text-white">
        <p className="text-sm font-black">
          <span aria-hidden="true">🛒 </span>FreshCart
        </p>
        <p className="text-[11px] font-bold text-white/80">
          {paid ? "Order placed" : "Your cart"} · {items.length} items
        </p>
      </div>
      <ul className={`min-h-0 flex-1 overflow-y-auto px-3 py-1.5 ${flags[0] ? FLAG : ""}`}>
        {items.length === 0 && <li className="py-1 text-sm font-semibold text-gray-500">The cart is empty</li>}
        {items.map((item, i) => {
          const { name, price } = (item ?? {}) as { name?: unknown; price?: unknown };
          return (
            <li key={i} className="flex items-center justify-between gap-2 border-b border-gray-100 py-1.5 text-[13px] font-semibold text-ink last:border-0">
              <span className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-[11px] font-black text-brand-700" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="truncate">{readable(name ?? item)}</span>
              </span>
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
    </div>
  );
}
