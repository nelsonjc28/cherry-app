<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DayFortyFive extends Model
{
    protected $fillable = [
        'user_id',
        'startDate',
        'endDate',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
