'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, ChevronRight, Check, ArrowLeft, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
// Import local JSON data
// Use require to avoid server-side fs issues in client component if mapped directly
// typically we can import json in Next.js
import thailandData from '../lib/thai-address-data.json';

interface AddressFormProps {
    initialData?: any;
    isEdit?: boolean;
}

export default function AddressForm({ initialData, isEdit = false }: AddressFormProps) {
    const router = useRouter();
    const { language } = useLanguage();
    const [loading, setLoading] = useState(false);

    // Form States
    const [name, setName] = useState(initialData?.name || ''); // Combined Name Surname
    const [phone, setPhone] = useState(initialData?.phone || '');
    const [addressLine, setAddressLine] = useState(initialData?.addressLine || '');
    const [isDefault, setIsDefault] = useState(initialData?.isDefault || false);

    // Location States
    const [province, setProvince] = useState(initialData?.province || '');
    const [district, setDistrict] = useState(initialData?.district || ''); // Amphoe
    const [subDistrict, setSubDistrict] = useState(initialData?.subDistrict || ''); // Tambon
    const [zipCode, setZipCode] = useState(initialData?.zipCode || '');

    // Selector Modal State
    const [showSelector, setShowSelector] = useState(false);
    const [selectorStep, setSelectorStep] = useState<'province' | 'district' | 'subDistrict'>('province');
    // We can derive Zipcode from SubDistrict, usually unique or selectable. 
    // In jquery.Thailand.js data: province -> amphoe -> district (tambon) -> zipcode.
    // Sometimes multiple zipcodes? Usually 1 per Tambon.

    // Filtered Options for Selector
    const [searchTerm, setSearchTerm] = useState('');

    // Handlers for Selector
    const handleProvinceSelect = (prov: string) => {
        setProvince(prov);
        setDistrict('');
        setSubDistrict('');
        setZipCode('');
        setSelectorStep('district');
        setSearchTerm('');
    };

    const handleDistrictSelect = (dist: string) => {
        setDistrict(dist);
        setSubDistrict('');
        setZipCode('');
        setSelectorStep('subDistrict');
        setSearchTerm('');
    };

    const handleSubDistrictSelect = (sub: string, zip: string) => {
        setSubDistrict(sub);
        setZipCode(zip);
        setShowSelector(false); // Done
        setSearchTerm('');
        // Reset step for next time
        setSelectorStep('province');
    };

    // Derived Lists based on selection
    const getProvinces = () => {
        // Data is flat, so we need unique provinces
        const provinces = new Set(thailandData.map((p: any) => p.province));
        return Array.from(provinces).sort();
    };

    const getDistricts = () => {
        if (!province) return [];
        // Filter by province, then get unique amphoes
        const filtered = thailandData.filter((p: any) => p.province === province);
        const amphoes = new Set(filtered.map((p: any) => p.amphoe));
        return Array.from(amphoes).sort();
    };

    const getSubDistricts = () => {
        if (!province || !district) return [];
        // Filter by province and amphoe
        const filtered = thailandData.filter((p: any) => p.province === province && p.amphoe === district);
        // Map to object with name and zipcode (some might share names but different zip? rare but possible)
        // Usually district names are unique within amphoe
        return filtered.map((p: any) => ({
            name: p.district,
            zipcode: p.zipcode
        })).sort((a: any, b: any) => a.name.localeCompare(b.name));
    };

    // Filter logic
    const filterOptions = (options: any[]) => {
        if (!searchTerm) return options;
        return options.filter(opt => {
            const val = typeof opt === 'string' ? opt : opt.name;
            return val.toLowerCase().includes(searchTerm.toLowerCase());
        });
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const method = isEdit ? 'PUT' : 'POST';
            const url = isEdit ? `/api/user/addresses/${initialData._id}` : '/api/user/addresses';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    phone,
                    province,
                    district,
                    subDistrict,
                    zipCode,
                    addressLine,
                    isDefault,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save address');
            }

            toast.success(isEdit ? 'Address updated' : 'Address added');
            router.push('/profile/addresses');
            router.refresh();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(language === 'th' ? 'คุณแน่ใจหรือไม่ว่าต้องการลบที่อยู่นี้?' : 'Are you sure you want to delete this address?')) return;
        setLoading(true);

        try {
            const res = await fetch(`/api/user/addresses/${initialData._id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete address');

            toast.success(language === 'th' ? 'ลบที่อยู่เรียบร้อย' : 'Address deleted');
            router.push('/profile/addresses');
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete address');
            setLoading(false);
        }
    };

    // Render Selector Content
    const renderSelector = () => {
        if (!showSelector) return null;

        let title = language === 'th' ? 'เลือกจังหวัด' : 'Select Province';
        let options: any[] = [];
        let onSelect: (val: any) => void = () => { };

        if (selectorStep === 'province') {
            title = language === 'th' ? 'จังหวัด' : 'Province';
            options = getProvinces();
            onSelect = handleProvinceSelect;
        } else if (selectorStep === 'district') {
            title = language === 'th' ? 'เขต/อำเภอ' : 'District';
            options = getDistricts();
            onSelect = handleDistrictSelect;
        } else if (selectorStep === 'subDistrict') {
            title = language === 'th' ? 'แขวง/ตำบล' : 'Sub-district';
            options = getSubDistricts();
            onSelect = (val: any) => handleSubDistrictSelect(val.name, val.zipcode);
        }

        const filtered = filterOptions(options);

        return (
            <div className="fixed inset-0 bg-white z-[60] flex flex-col animate-in slide-in-from-bottom duration-200">
                {/* Selector Header */}
                <div className="flex items-center p-4 border-b border-gray-100 gap-3">
                    <button onClick={() => {
                        if (selectorStep === 'province') setShowSelector(false);
                        else if (selectorStep === 'district') setSelectorStep('province');
                        else if (selectorStep === 'subDistrict') setSelectorStep('district');
                    }}>
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-800">{title}</h3>
                    </div>
                    <button onClick={() => setShowSelector(false)}>
                        <span className="text-gray-500 text-sm">{language === 'th' ? 'ยกเลิก' : 'Cancel'}</span>
                    </button>
                </div>

                {/* Search Bar (Optional but good) */}
                <div className="p-4 bg-gray-50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder={language === 'th' ? `ค้นหา${title}...` : `Search ${title}...`}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Breadcrumbs / Current Selection to show progress */}
                <div className="px-4 py-2 flex items-center text-sm text-gray-500 border-b border-gray-100 overflow-x-auto whitespace-nowrap">
                    <span className={selectorStep === 'province' ? 'text-red-500 font-bold' : (province ? 'text-gray-900 border-b-2 border-transparent' : 'text-gray-400')}>
                        {province || (language === 'th' ? 'จังหวัด' : 'Province')}
                    </span>
                    <ChevronRight className="w-4 h-4 mx-1 flex-shrink-0" />
                    <span className={selectorStep === 'district' ? 'text-red-500 font-bold' : (district ? 'text-gray-900' : 'text-gray-400')}>
                        {district || (language === 'th' ? 'เขต/อำเภอ' : 'District')}
                    </span>
                    <ChevronRight className="w-4 h-4 mx-1 flex-shrink-0" />
                    <span className={selectorStep === 'subDistrict' ? 'text-red-500 font-bold' : (subDistrict ? 'text-gray-900' : 'text-gray-400')}>
                        {subDistrict || (language === 'th' ? 'แขวง/ตำบล' : 'Sub-district')}
                    </span>
                </div>

                {/* Options List */}
                <div className="flex-1 overflow-y-auto">
                    {filtered.map((opt: any, idx: number) => {
                        const label = typeof opt === 'string' ? opt : opt.name;
                        // Use unique keys
                        const key = `${label}-${idx}`;
                        return (
                            <div
                                key={key}
                                className="p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                                onClick={() => onSelect(opt)}
                            >
                                <span className="text-gray-800">{label}</span>
                                {typeof opt !== 'string' && <span className="text-gray-400 text-xs">{String(opt.zipcode || '')}</span>}
                            </div>
                        );
                    })}
                    {filtered.length === 0 && (
                        <div className="p-8 text-center text-gray-400 text-sm">No results found</div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 relative">
            {/* Header */}
            <div className="bg-white p-4 flex items-center gap-3 border-b border-gray-100 sticky top-0 z-10">
                <button onClick={() => router.back()} className="text-gachar-red">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-bold text-gray-900 flex-1">
                    {isEdit
                        ? (language === 'th' ? 'แก้ไขที่อยู่' : 'Edit Address')
                        : (language === 'th' ? 'ที่อยู่ใหม่' : 'New Address')}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="mt-2">
                {/* Contact Info Block */}
                <div className="bg-white px-4">
                    <div className="py-3 border-b border-gray-50">
                        <label className="block text-gray-500 text-xs mb-1">
                            {language === 'th' ? 'ชื่อ นามสกุล' : 'Name Surname'}
                        </label>
                        <input
                            type="text"
                            className="w-full text-base outline-none text-gray-900 font-medium"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="py-3 border-b border-gray-50">
                        <label className="block text-gray-500 text-xs mb-1">
                            {language === 'th' ? 'หมายเลขโทรศัพท์' : 'Phone Number'}
                        </label>
                        <input
                            type="tel"
                            className="w-full text-base outline-none text-gray-900 font-medium"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                        />
                    </div>
                </div>

                {/* Address Info Block */}
                <div className="mt-2 bg-white px-4">
                    <div
                        className="py-4 border-b border-gray-50 flex justify-between items-start cursor-pointer"
                        onClick={() => setShowSelector(true)}
                    >
                        <div className="flex-1">
                            <label className="block text-gray-500 text-xs mb-2">
                                {language === 'th' ? 'จังหวัด, เขต/อำเภอ, แขวง/ตำบล, รหัสไปรษณีย์' : 'Province, District, Sub-district, Zipcode'}
                            </label>

                            {province ? (
                                <div className="space-y-0.5 text-base text-gray-900 font-medium">
                                    <div className="block">{province}</div>
                                    <div className="block">{district}</div>
                                    <div className="block">{subDistrict}</div>
                                    <div className="block">{zipCode}</div>
                                </div>
                            ) : (
                                <span className="text-gray-300 text-base">
                                    {language === 'th' ? 'เลือกที่อยู่' : 'Select Location'}
                                </span>
                            )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 mt-2 flex-shrink-0" />
                    </div>

                    <div className="py-3">
                        <label className="block text-gray-500 text-xs mb-1">
                            {language === 'th' ? 'บ้านเลขที่, ซอย, หมู่, ถนน' : 'Address Line'}
                        </label>
                        <input
                            type="text"
                            className="w-full text-base outline-none text-gray-900 font-medium"
                            value={addressLine}
                            onChange={(e) => setAddressLine(e.target.value)}
                            required
                        />
                    </div>
                </div>

                {/* Settings Block */}
                <div className="mt-2 bg-white px-4 py-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-800 font-medium">
                            {language === 'th' ? 'ตั้งเป็นที่อยู่เริ่มต้น' : 'Set as Default Address'}
                        </span>
                        <div
                            className={`w-11 h-6 rounded-full flex items-center transition-colors px-0.5 cursor-pointer ${isDefault ? 'bg-green-500' : 'bg-gray-300'}`}
                            onClick={() => setIsDefault(!isDefault)}
                        >
                            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${isDefault ? 'translate-x-5' : ''}`} />
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 px-4 pb-8">
                    {isEdit ? (
                        <div className="flex gap-3">
                            {/* Delete Button */}
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={loading}
                                className="flex-1 py-3 rounded border border-gachar-red text-gachar-red font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {language === 'th' ? 'ลบที่อยู่' : 'Delete'}
                            </button>

                            {/* Save Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-3 rounded bg-gachar-red text-white font-medium shadow-lg shadow-red-200 hover:bg-red-600 disabled:bg-gray-400 disabled:shadow-none disabled:cursor-not-allowed"
                            >
                                {loading
                                    ? (language === 'th' ? 'กำลังบันทึก...' : 'Saving...')
                                    : (language === 'th' ? 'ยืนยัน' : 'Confirm')}
                            </button>
                        </div>
                    ) : (
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3 rounded text-white font-medium ${loading ? 'bg-gray-400' : 'bg-gachar-red shadow-lg shadow-red-200'}`}
                        >
                            {loading
                                ? (language === 'th' ? 'กำลังบันทึก...' : 'Saving...')
                                : (language === 'th' ? 'บันทึก' : 'Submit')}
                        </button>
                    )}
                </div>
            </form>

            {/* Selector Modal */}
            {renderSelector()}
        </div>
    );
}
