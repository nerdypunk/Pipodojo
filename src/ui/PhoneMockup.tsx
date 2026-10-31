// The app screen inside Pipo's phone: a chat, a store cart, an email or a calendar. Built from
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
  if (action.app === "whatsapp") return <ChatScreen action={action} flags={flags} />;
  if (action.app === "email") return <EmailScreen action={action} flags={flags} />;
  if (action.app === "calendar") return <CalendarScreen action={action} flags={flags} />;
  return <ShopScreen action={action} flags={flags} />;
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
          <span aria-hidden="true">🛒 </span>
          {action.store ?? "FreshCart"}
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
            <span aria-hidden="true">🚚 </span>
            {action.whenLabel ?? "Delivery"}
          </span>
          <span>{readable(action.args.delivery)}</span>
        </p>
      </div>
    </div>
  );
}

/** An email: a draft waits in the compose view until you send it; once sent it's in Sent. */
function EmailScreen({ action, flags }: Props) {
  const to = readable(action.args.to);
  const subject = readable(action.args.subject);
  const body = typeof action.args.body === "string" ? action.args.body.trim() : readable(action.args.body);
  const sent = action.outcome === "done";
  return (
    <div className="flex h-full flex-col" aria-label={`Email to ${to}${sent ? ", sent" : ", draft waiting for your OK"}`}>
      <div className="flex items-center justify-between bg-sky-600 px-3 py-2.5 text-white">
        <p className="text-sm font-black">
          <span aria-hidden="true">✉️ </span>
          {action.store ?? "Mail"}
        </p>
        <p className="text-[11px] font-bold text-white/85">{sent ? "Sent" : "Draft"}</p>
      </div>
      <div className="space-y-1 border-b border-gray-100 px-3 py-2 text-[13px]">
        <p className={`truncate rounded-md px-1 font-semibold text-gray-600 ${flags[0] ? FLAG : ""}`}>
          To: <span className="font-black text-ink">{to}</span>
        </p>
        <p className={`truncate rounded-md px-1 font-black text-ink ${flags[1] ? FLAG : ""}`}>{subject}</p>
      </div>
      <p
        className={`m-2 min-h-0 flex-1 overflow-y-auto rounded-xl px-2 py-1.5 text-[13px] leading-snug font-semibold whitespace-pre-line text-ink ${
          flags[2] ? FLAG : ""
        }`}
      >
        {body}
      </p>
      {sent && (
        <p className="pop-in mx-3 mb-2 rounded-lg bg-emerald-50 px-2 py-1 text-center text-xs font-black text-emerald-700">✓ Delivered</p>
      )}
    </div>
  );
}

/** A calendar: the events Pipo added (or is waiting to add), each with its day and time. */
function CalendarScreen({ action, flags }: Props) {
  const events = Array.isArray(action.args.events) ? action.args.events : [];
  const added = action.outcome === "done";
  const reminder = action.args.reminder;
  return (
    <div className="flex h-full flex-col" aria-label={`${action.store ?? "Calendar"}, ${events.length} events${added ? " added" : " waiting for your OK"}`}>
      <div className="flex items-center justify-between bg-rose-500 px-3 py-2.5 text-white">
        <p className="text-sm font-black">
          <span aria-hidden="true">📅 </span>
          {action.store ?? "Calendar"}
        </p>
        <p className="text-[11px] font-bold text-white/85">{added ? "Added" : "Not added yet"}</p>
      </div>
      <ul className={`min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-2 ${flags[0] ? FLAG : ""}`}>
        {events.length === 0 && <li className="text-sm font-semibold text-gray-500">No events</li>}
        {events.map((event, i) => {
          const { name, when } = (event ?? {}) as { name?: unknown; when?: unknown };
          return (
            <li key={i} className={`flex gap-2 rounded-xl px-2 py-1.5 ${added ? "bg-rose-50" : "border-2 border-dashed border-rose-200"}`}>
              <span className="w-1 shrink-0 rounded-full bg-rose-400" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-black text-ink">{readable(name ?? event)}</span>
                <span className="block text-[12px] font-semibold text-gray-600">{when === undefined ? "No time set" : readable(when)}</span>
              </span>
            </li>
          );
        })}
      </ul>
      {reminder !== undefined && (
        <p className={`mx-3 mb-2 rounded-md px-1 text-[12px] font-bold text-gray-700 ${flags[1] ? FLAG : ""}`}>
          <span aria-hidden="true">🔔 </span>
          {readable(reminder)}
        </p>
      )}
    </div>
  );
}
