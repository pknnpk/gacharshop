import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStockHistory extends Document {
    product: mongoose.Types.ObjectId;
    location?: mongoose.Types.ObjectId;
    user?: mongoose.Types.ObjectId;
    action: 'adjustment' | 'transfer' | 'sale' | 'return' | 'receive' | 'set';
    change: number; // +5, -2, etc.
    previousStock: number; // Snapshot before change
    newStock: number; // Snapshot after change
    reason?: string;
    timestamp: Date;
}

const StockHistorySchema = new Schema<IStockHistory>({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    location: { type: Schema.Types.ObjectId, ref: 'Location' },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    action: {
        type: String,
        enum: ['adjustment', 'transfer', 'sale', 'return', 'receive', 'set'],
        required: true
    },
    change: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    reason: { type: String },
    timestamp: { type: Date, default: Date.now }
});

// Force model recreation in dev to handle schema changes
const StockHistory: Model<IStockHistory> = mongoose.models.StockHistory || mongoose.model<IStockHistory>('StockHistory', StockHistorySchema);

export default StockHistory;
