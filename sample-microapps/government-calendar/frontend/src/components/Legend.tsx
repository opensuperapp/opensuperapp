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
const Legend: React.FC = () => {
    return (
        <div className="flex flex-col gap-2 mt-4 text-sm">
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 inline-block rounded"></span>
                <span className="text-xs text-slate-400">Today</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-yellow-200 inline-block rounded"></span>
                <span className="text-xs text-slate-400">Public, Bank Holidays</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-yellow-500 inline-block rounded"></span>
                <span className="text-xs text-slate-400">
                    Public, Bank, Mercantile Holidays
                </span>
            </div>
        </div>
    );
};

export default Legend;
