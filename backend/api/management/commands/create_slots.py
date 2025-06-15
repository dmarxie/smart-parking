from django.core.management.base import BaseCommand
from api.models import ParkingLocation, ParkingSlot

class Command(BaseCommand):
    help = 'Creates parking slots for a location'

    def add_arguments(self, parser):
        parser.add_argument('location_id', type=int, help='ID of the location to create slots for')
        parser.add_argument('--total', type=int, default=50, help='Total number of slots to create')

    def handle(self, *args, **options):
        location_id = options['location_id']
        total_slots = options['total']

        try:
            location = ParkingLocation.objects.get(id=location_id)
        except ParkingLocation.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Location with ID {location_id} does not exist'))
            return

        ParkingSlot.objects.filter(location=location).delete()

        slots = []
        for i in range(1, total_slots + 1):
            slot = ParkingSlot(
                location=location,
                slot_number=f'A{i:03d}', 
                is_occupied=False,
                is_reserved=False
            )
            slots.append(slot)

        ParkingSlot.objects.bulk_create(slots)

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {total_slots} slots for location {location.name}')
        ) 