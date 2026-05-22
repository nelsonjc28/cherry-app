import { useState } from 'react';
import PropTypes from 'prop-types';
import CustomButton from '../CustomButton';
import { getIconPath } from '../../utils/assetPaths';
import { shareOrderPdf } from '../../utils/shareProductUtils';
import { formatOrderNumberDisplay } from '../../utils/orderDisplayNumber';
import { getOrderDisplayTotal } from '../../utils/checkoutOrderDisplay';
import { ordersQualifyForExternalApi } from '../../utils/orderExternalApi';

/**
 * Botón compartir PDF del pedido (misma lógica que catálogo/productos).
 */
export default function CheckoutSuccessShareButton({ orders, orderInfoFallback = null }) {
  const [isSharingOrder, setIsSharingOrder] = useState(false);

  if (!Array.isArray(orders) || orders.length === 0 || !ordersQualifyForExternalApi(orders)) {
    return null;
  }

  const handleShareOrder = async () => {
    const primary = orders[0];
    if (!primary?.id || isSharingOrder) return;

    const labels = orders.map((o) => formatOrderNumberDisplay(o));
    const orderLabel = labels.length > 1 ? labels.join(' + ') : labels[0];
    const combinedTotal = orders.reduce(
      (sum, o) => sum + getOrderDisplayTotal(o, orderInfoFallback),
      0
    );
    const pdfBase =
      labels.length > 1 ? `pedidos-${labels.join('-')}` : `pedido-${labels[0]}`;

    try {
      setIsSharingOrder(true);
      await shareOrderPdf({
        orderId: primary.id,
        pdf_name: `${pdfBase}.pdf`,
        orderLabel,
        totalFormatted: `$${combinedTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      });
    } catch {
      // shareOrderPdf ya muestra toast
    } finally {
      setIsSharingOrder(false);
    }
  };

  return (
    <div className="checkout-success-share-wrap">
      <CustomButton
        variant="outlined"
        onClick={handleShareOrder}
        disabled={isSharingOrder}
        className="btn-checkout checkout-success-share-btn"
        iconLeft={
          <img src={getIconPath('Share Alt.svg')} alt="" width={18} height={18} />
        }
      >
        {isSharingOrder ? 'Compartiendo...' : 'Compartir pedido (PDF)'}
      </CustomButton>
    </div>
  );
}

CheckoutSuccessShareButton.propTypes = {
  orders: PropTypes.arrayOf(PropTypes.object).isRequired,
  orderInfoFallback: PropTypes.object,
};
