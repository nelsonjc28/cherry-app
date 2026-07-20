<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Tymon\JWTAuth\Contracts\JWTSubject;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Address> $addresses
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PaymentCard> $paymentCards
 * @property-read \App\Models\Address|null $defaultAddress
 * @property-read \App\Models\PaymentCard|null $defaultPaymentCard
 */
class User extends Authenticatable implements JWTSubject
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'first_name',
        'last_name',
        'middle_name',
        'phone',
        'email',
        'password',
        'role_id',
        'birth_day',
        'birth_month',
        'birth_year',
        'seller_category',
        'bronze_benefit_active',
        'benefit_expires_at',
        'categoria_last_purchase',
        'categoria_expires_at',
        'first_purchase_completed_at',
        'credit_balance',
        'credit_limit',
        'welcome_sent',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = [
        'day_forty_five',
        'free_shipping',
        'free_shipping_min_amount',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'bronze_benefit_active' => 'boolean',
            'benefit_expires_at' => 'datetime',
            'categoria_last_purchase' => 'datetime',
            'categoria_expires_at' => 'datetime',
            'first_purchase_completed_at' => 'datetime',
            'credit_balance' => 'decimal:2',
            'credit_limit' => 'decimal:2',
            'welcome_sent' => 'boolean',
        ];
    }

    /**
     * Get the role that belongs to this user.
     */
    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function cart(): HasOne
    {
        return $this->hasOne(Cart::class);
    }

    public function productNotifications(): HasMany
    {
        return $this->hasMany(ProductNotification::class);
    }

    /**
     * Check if the user is an admin
     */
    public function isAdmin()
    {
        return $this->role && $this->role->name === 'admin';
    }

    /**
     * Check if the user is a cliente
     */
    public function isCliente()
    {
        return $this->role && $this->role->name === 'cliente';
    }

    /**
     * Check if the user is an operator
     */
    public function isOperator()
    {
        return $this->role && $this->role->name === 'operador';
    }

    /**
     * Check if the user has role 'vendedor'.
     * Un vendedor gestiona pedidos en nombre de clientes oro/diamante asociados.
     */
    public function isVendedor()
    {
        return $this->role && $this->role->name === 'vendedor';
    }

    /**
     * Admin u operador (mismas rutas que AdminMiddleware).
     */
    public function isAdminOrOperator(): bool
    {
        return $this->isAdmin() || $this->isOperator();
    }

    /**
     * Check if the user has a specific role
     */
    public function hasRole($roleName)
    {
        return $this->role && $this->role->name === $roleName;
    }

    /**
     * Get the user's full name
     */
    public function getFullNameAttribute()
    {
        $name = $this->first_name;
        if ($this->middle_name) {
            $name .= ' ' . $this->middle_name;
        }
        if ($this->last_name) {
            $name .= ' ' . $this->last_name;
        }
        return $name;
    }

    public function getDayFortyFiveAttribute()
    {
        $dayFortyFive = DayFortyFive::where('user_id', $this->id)->first();
        if ($dayFortyFive != null) {
            if (Carbon::now()->between($dayFortyFive->startDate, $dayFortyFive->endDate)) {
                return true;
            }
        }
        return false;
    }

    public function getFreeShippingAttribute()
    {
        $today = now()->toDateString();
        $haveOffert = CatalogOfferUser::join('catalog_offers', 'catalog_offer_users.offer_id', '=', 'catalog_offers.id')
            ->where('catalog_offer_users.user_id', $this->id)
            ->where('catalog_offers.is_active', true)
            ->whereDate('catalog_offers.start_date', '<=', $today)
            ->whereDate('catalog_offers.end_date', '>=', $today)
            ->where('catalog_offers.discount_category', 'free_shipping')
            ->count();

        return $haveOffert >= 1 ? true : false;
    }
    
    /**
     * Obtener el monto mínimo para envío gratis (si aplica al usuario)
     * Se limita a un máximo de 3000 según la regla de negocio.
     */
    public function getFreeShippingMinAmountAttribute()
    {
        $today = now()->toDateString();
        $offer = CatalogOfferUser::join('catalog_offers', 'catalog_offer_users.offer_id', '=', 'catalog_offers.id')
            ->where('catalog_offer_users.user_id', $this->id)
            ->where('catalog_offers.is_active', true)
            ->whereDate('catalog_offers.start_date', '<=', $today)
            ->whereDate('catalog_offers.end_date', '>=', $today)
            ->where('catalog_offers.discount_category', 'free_shipping')
            ->orderBy('catalog_offers.min_purchase_amount', 'asc')
            ->select('catalog_offers.min_purchase_amount')
            ->first();

        if (!$offer || $offer->min_purchase_amount === null) {
            return 0;
        }

        $amount = floatval($offer->min_purchase_amount);
        if ($amount <= 0) {
            return 0;
        }
        // No puede ser superior a 3000
        return min($amount, 3000);
    }
    /**
     * Get the addresses for the user.
     */
    public function addresses(): HasMany
    {
        return $this->hasMany(Address::class);
    }

    public function dayFortyFive(): HasMany
    {
        return $this->hasMany(DayFortyFive::class);
    }

    /**
     * Get the default address for the user.
     */
    public function defaultAddress()
    {
        return $this->hasOne(Address::class)->where('is_default', true);
    }

    /**
     * Get the payment cards for the user.
     */
    public function paymentCards(): HasMany
    {
        return $this->hasMany(PaymentCard::class);
    }

    /**
     * Get the default payment card for the user.
     */
    public function defaultPaymentCard()
    {
        return $this->hasOne(PaymentCard::class)->where('is_default', true);
    }

    /**
     * Compradores asociados a este usuario cuando actúa como vendedor.
     * Sólo retorna asociaciones activas (filtradas en query si se necesita el universo completo).
     */
    public function buyers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'vendor_buyer', 'vendor_id', 'buyer_id')
            ->withPivot('is_active')
            ->withTimestamps();
    }

    /**
     * Vendedores que tienen a este usuario como comprador asociado.
     */
    public function vendors(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'vendor_buyer', 'buyer_id', 'vendor_id')
            ->withPivot('is_active')
            ->withTimestamps();
    }

    // Métodos requeridos por JWTSubject
    public function getJWTIdentifier(): mixed
    {
        return $this->getKey();
    }
    public function getJWTCustomClaims(): array
    {
        return [];
    }

    /**
     * Check if the user has seller category 'oro'
     */
    public function isOroSeller()
    {
        return $this->seller_category === 'oro';
    }

    /**
     * Check if the user has seller category 'diamante'
     */
    public function isDiamanteSeller()
    {
        return $this->seller_category === 'diamante';
    }

    /**
     * Check if the user has premium seller category (oro or diamante)
     */
    public function isPremiumSeller()
    {
        $cat = strtolower(trim((string) ($this->seller_category ?? '')));

        return in_array($cat, ['oro', 'diamante', 'gold', 'diamond'], true);
    }

    /**
     * Check if the user has seller category 'bronce'
     */
    public function isBronceSeller()
    {
        return $this->seller_category === 'bronce';
    }

    /**
     * Check if the user can make advance orders (encargos)
     */
    public function canMakeAdvanceOrders(): bool
    {
        return $this->isPremiumSeller();
    }

    /**
     * Check if the user has available credit
     */
    public function hasCredit()
    {
        return $this->isOroSeller() && $this->credit_balance > 0;
    }
}
