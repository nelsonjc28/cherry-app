<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MailConfig extends Model
{
    protected $fillable = [
        'mail_type',
        'image_path',
    ];

    public const TYPE_WELCOME = 'welcome';

    public const TYPE_ORDER_CONFIRMATION = 'order_confirmation';

    public const TYPE_ABANDONED_CART = 'abandoned_cart';

    public const TYPE_ORDER_STATUS = 'order_status';

    public const TYPE_PRODUCT_AVAILABLE = 'product_available';

    /** @return list<string> */
    public static function allTypes(): array
    {
        return [
            self::TYPE_WELCOME,
            self::TYPE_ORDER_CONFIRMATION,
            self::TYPE_ABANDONED_CART,
            self::TYPE_ORDER_STATUS,
            self::TYPE_PRODUCT_AVAILABLE,
        ];
    }
}
