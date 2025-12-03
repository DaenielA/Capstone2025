import React from 'react';
import { Transaction } from './actions';

interface PrintableReceiptProps {
  transaction: Transaction | null;
}

export const PrintableReceipt = React.forwardRef<HTMLDivElement, PrintableReceiptProps>(({ transaction }, ref) => {
  if (!transaction) {
    return null;
  }

  const { Id, Date, Time, ItemDetails, Total, PaymentMethod, Cashier, Member, ManualDiscountAmount } = transaction;

  const subtotal = ItemDetails.reduce((acc, item) => acc + (item.Price * item.Quantity), 0);

  return (
    <div ref={ref} className="p-2 text-gray-800 bg-white font-mono text-sm">
      <div className="text-center mb-2">
        <h1 className="text-lg font-bold">Pandol Cooperative</h1>
        <p>Pandol, Corella, Bohol</p>
        <p>+63 (38) 412-5678</p>
      </div>

      <div className="mb-2">
        <p><strong>Receipt #:</strong> {Id}</p>
        <p><strong>Date:</strong> {Date} {Time}</p>
        <p><strong>Cashier:</strong> {Cashier}</p>
        {Member && <p><strong>Member:</strong> {Member}</p>}
      </div>

      <hr className="border-dashed border-gray-400 my-2" />

      <table className="w-full mb-1">
        <thead>
          <tr>
            <th className="text-left">Item</th>
            <th className="text-center">Qty</th>
            <th className="text-right">Price</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {ItemDetails.map((item, index) => (
            <tr key={index}>
              <td className="text-left">{item.Name}</td>
              <td className="text-center">{item.Quantity}</td>
              <td className="text-right">₱{item.Price.toFixed(2)}</td>
              <td className="text-right">₱{(item.Price * item.Quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr className="border-dashed border-gray-400 my-2" />

      <div className="space-y-0.5 text-right">
        <p>
          Subtotal: <span className="font-semibold">₱{subtotal.toFixed(2)}</span>
        </p>
        {ManualDiscountAmount && ManualDiscountAmount > 0 && (
          <p>
            Discount: <span className="font-semibold">- ₱{ManualDiscountAmount.toFixed(2)}</span>
          </p>
        )}
        <p className="text-sm font-bold">
          TOTAL: <span className="font-semibold">₱{Total.toFixed(2)}</span>
        </p>
      </div>

      <hr className="border-dashed border-gray-400 my-2" />

      <div className="text-center my-2">
        <p><strong>Payment Method:</strong> {PaymentMethod}</p>
      </div>

      <div className="text-center">
        <p>Thank you for your purchase!</p>
        <p>Please come again.</p>
      </div>
    </div>
  );
});

PrintableReceipt.displayName = 'PrintableReceipt';
