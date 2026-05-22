// Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.
import React from 'react';

const HOLIDAY_TYPES = {
    FULL: "holiday_type_1",
    BANK: "holiday_type_2",
} as const;

type Props = {
    calendarDays: Array<Date | null>;
    getHolidayType: (date: Date) => string | null;
    selectedDate: Date | null;
    setSelectedDate: (d: Date | null) => void;
};

const CalendarGrid: React.FC<Props> = ({ calendarDays, getHolidayType, selectedDate, setSelectedDate }) => {
    return (
        <>
            <div className="grid grid-cols-7 text-center text-sm font-medium text-gray-500">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
            </div>

            <div className="grid grid-cols-7 text-center mt-2">
                {calendarDays.map((date, idx) => {
                    if (!date) return <div key={idx} className="p-2"></div>;

                    const type = getHolidayType(date);
                    const dayNum = date.getDate();
                    const todayStr = new Date().toDateString();
                    const isToday = date.toDateString() === todayStr;
                    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();

                    let className = "w-7 h-7 flex items-center justify-center mx-auto rounded-lg text-md text-stone-950 cursor-pointer";

                    if (isToday) className += " bg-blue-500 text-white shadow-sm font-semibold";
                    if (type === HOLIDAY_TYPES.FULL) className += " bg-yellow-500";
                    else if (type === HOLIDAY_TYPES.BANK) className += " bg-yellow-200";
                    if (isSelected) className += " ring-2 ring-stone-600";

                    return (
                        <div key={idx} className="p-1">
                            <div className={className} onClick={() => setSelectedDate(date)}>
                                {dayNum}
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
};

export default CalendarGrid;
