/// PanelOS panel. Mirrors the API contract documented in `docs/api/`.
class Panel {
  const Panel({
    required this.id,
    required this.tag,
    required this.name,
    required this.status,
    this.location,
    this.customer,
    this.voltage,
    this.currentRevisionId,
    this.updatedAt,
    this.metadata = const <String, String>{},
  });

  final String id;
  final String tag;
  final String name;
  final String status;
  final String? location;
  final String? customer;
  final String? voltage;
  final String? currentRevisionId;
  final DateTime? updatedAt;
  final Map<String, String> metadata;

  factory Panel.fromJson(Map<String, dynamic> json) {
    final rawMeta = json['metadata'];
    final metadata = <String, String>{};
    if (rawMeta is Map) {
      rawMeta.forEach((k, v) {
        if (k is String && v != null) metadata[k] = v.toString();
      });
    }
    return Panel(
      id: json['id'] as String,
      tag: (json['tag'] as String?) ?? '',
      name: (json['name'] as String?) ?? '',
      status: (json['status'] as String?) ?? 'unknown',
      location: json['location'] as String?,
      customer: json['customer'] as String?,
      voltage: json['voltage'] as String?,
      currentRevisionId: json['currentRevisionId'] as String?,
      updatedAt: json['updatedAt'] is String
          ? DateTime.tryParse(json['updatedAt'] as String)
          : null,
      metadata: metadata,
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
        'id': id,
        'tag': tag,
        'name': name,
        'status': status,
        if (location != null) 'location': location,
        if (customer != null) 'customer': customer,
        if (voltage != null) 'voltage': voltage,
        if (currentRevisionId != null) 'currentRevisionId': currentRevisionId,
        if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
        'metadata': metadata,
      };

  Panel copyWith({
    String? id,
    String? tag,
    String? name,
    String? status,
    String? location,
    String? customer,
    String? voltage,
    String? currentRevisionId,
    DateTime? updatedAt,
    Map<String, String>? metadata,
  }) {
    return Panel(
      id: id ?? this.id,
      tag: tag ?? this.tag,
      name: name ?? this.name,
      status: status ?? this.status,
      location: location ?? this.location,
      customer: customer ?? this.customer,
      voltage: voltage ?? this.voltage,
      currentRevisionId: currentRevisionId ?? this.currentRevisionId,
      updatedAt: updatedAt ?? this.updatedAt,
      metadata: metadata ?? this.metadata,
    );
  }
}
