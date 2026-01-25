import mongoose, { Schema, model, models } from 'mongoose';

const AddressSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: true,
        },
        province: {
            type: String,
            required: true,
        },
        district: {
            type: String,
            required: true,
        },
        subDistrict: {
            type: String,
            required: true,
        },
        zipCode: {
            type: String,
            required: true,
        },
        addressLine: {
            type: String,
            required: true,
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

const Address = models.Address || model('Address', AddressSchema);

export default Address;
