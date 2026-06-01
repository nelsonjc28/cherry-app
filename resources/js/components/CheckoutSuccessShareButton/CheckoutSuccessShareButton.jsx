import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import CustomButton from '../CustomButton';
import { getIconPath } from '../../utils/assetPaths';
import { formatOrderNumberDisplay } from '../../utils/orderDisplayNumber';
import { getOrderDisplayTotal } from '../../utils/checkoutOrderDisplay';
/**
 * Botón compartir PDF del pedido (misma lógica que Mis pedidos / detalle de orden).
 */
export default function CheckoutSuccessShareButton({ orders, orderInfoFallback = null }) {
  const [isSharingOrder, setIsSharingOrder] = useState(false);

  const primary = orders?.[0];
  const canShare = Boolean(primary?.id);

  useEffect(() => {
    if (!canShare) return;

    const labels = orders.map((o) => formatOrderNumberDisplay(o));
    const pdfBase =
      labels.length > 1 ? `pedidos-${labels.join('-')}` : `pedido-${labels[0]}`;

    import('../../utils/shareProductUtils').then(({ prefetchOrderPdf }) => {
      prefetchOrderPdf(primary.id, `${pdfBase}.pdf`);
    });
  }, [orders, canShare, primary?.id]);

  if (!canShare) {
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
      const { shareOrderPdf } = await import('../../utils/shareProductUtils');
      await shareOrderPdf({
        orderId: primary.id,
        pdf_name: `${pdfBase}.pdf`,
        orderLabel,
        totalFormatted: `$${combinedTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      });
    } catch (error) {
      if (error?.name !== 'AbortError' && window.showToast) {
        const msg =
          error?.message && /PDF|pedido|Dompdf|generar/i.test(error.message)
            ? error.message
            : 'No se pudo compartir el pedido.';
        window.showToast(msg, 'error');
      }
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
